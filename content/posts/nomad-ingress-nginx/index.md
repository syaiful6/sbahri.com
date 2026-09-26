---
title: "In Search of a Better Nginx Ingress for Nomad"
date: 2026-09-17T11:44:00Z
draft: false
tags: ["devops", "nomad"]
categories: ["devops"]
summary: "It's fair to say that Nomad's Nginx ingress implementation is a long way from Kubernetes' Ingress NGINX."
---

I've had [HashiCorp Nomad](https://developer.hashicorp.com/nomad) running in my home lab for a while now, and I am pretty
happy with it. It's been fun and surprisingly simple. I understand how almost everything works under the hood. Well, mostly.

If I had to pick one thing to improve in Nomad, it would be the ingress gateway story. Some people are happy without an
ingress, but I am not one of them.

Nomad's own documentation on ingress mentions Nginx, Traefik, HAProxy, and Fabio. Since I am only familiar with Nginx, I chose
to use it. I have to say that the implementation is a long way from Kubernetes' Ingress NGINX. The community "nginx-ingress"
defined in [nomad pack](https://github.com/hashicorp/nomad-pack-community-registry/blob/main/packs/nomad_ingress_nginx/README.md)
may not work for everyone. It has no Consul Connect integration, so it cannot reach the services that I run in bridge mode
behind transparent proxies. It also cannot automatically generate TLS certificates.

The pack supports path-based routing, but it generates a separate Nginx server block for each service. As a result, multiple
services cannot reliably share one hostname while being mounted at different paths. I might want to mount
[Ghost](https://ghost.org/) at `/blog` and have everything else handled by another application.

So I decided to create my own Nginx ingress for Nomad. In this post, I will share how I created it.

## Creating a custom Nginx ingress

Since the community pack did not work for me, I decided to create my own. It will be a simple Nginx ingress that works with
the way I usually deploy HTTP services. My HTTP services run in bridge network mode with Consul Connect and transparent
proxies.

First, let's create a custom Docker image for this Nginx ingress. We will use the
[ACME](https://github.com/nginx/nginx-acme) module so it can generate TLS certificates automatically.

```docker
FROM rust:1.97-trixie AS nginx-acme-mod

RUN set -ex; \
  apt-get update && \
  apt-get install --yes --no-install-recommends --no-install-suggests \
    libclang-dev \
    libpcre2-dev \
    libssl-dev \
    zlib1g-dev \
    pkg-config \
    git \
    grep \
    gawk \
    gnupg2 \
    sed \
    make \
  && git clone --depth 1 --branch v0.4.1 https://github.com/nginx/nginx-acme.git \
  && git clone --depth 1 --branch release-1.31.4 https://github.com/nginx/nginx.git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /nginx
RUN set -ex; \
  auto/configure \
    --with-compat \
    --with-http_ssl_module \
    --add-dynamic-module=/nginx-acme \
  && make modules

FROM nginx:1.31-trixie

WORKDIR /

VOLUME /var/lib/acme/letsencrypt

COPY --from=nginx-acme-mod /nginx/objs/ngx_http_acme_module.so /usr/lib/nginx/modules/

RUN set -ex; \
  apt-get update && \
  apt-get install --yes --no-install-recommends --no-install-suggests python3 && \
  rm -rf /var/lib/apt/lists/*

COPY render.py /usr/local/bin/render.py
COPY bin/ingress-entrypoint /usr/local/bin/ingress-entrypoint
COPY bin/reload-ingress /usr/local/bin/reload-ingress
RUN chmod +x /usr/local/bin/render.py \
             /usr/local/bin/ingress-entrypoint \
             /usr/local/bin/reload-ingress

EXPOSE 443/tcp
EXPOSE 80/tcp

CMD ["/usr/local/bin/ingress-entrypoint"]
```

`render.py` is a simple Python script that processes Consul service metadata and generates an Nginx configuration file.
It needs to run once when the container starts and whenever Nomad detects a newly registered or deregistered service.
`reload-ingress` is a simple Bash script that reloads the Nginx configuration.

You can read the full implementation [here](https://gist.github.com/syaiful6/9f0f8ab86f57c3b61a57ab9b3cfc70dc).

The nice thing about Nomad is that it provides templating in its task definitions, which makes this implementation fairly
simple. Here is how I define the service:

```hcl
job "nginx-ingress" {
  type        = "service"
  region      = "global"
  datacenters = ["dc1"]
  namespace   = "default"

  constraint {
    attribute = "${attr.consul.version}"
    operator  = "is_set"
  }

  group "nginx" {
    count = 1

    volume "nginx-cert" {
      type   = "host"
      source = "nginx-cert-store"
    }

    network {
      mode = "bridge"

      port "http" {
        static       = 80
        to           = 80
        host_network = "public"
      }

      port "https" {
        static       = 443
        to           = 443
        host_network = "public"
      }
    }

    service {
      name = "nomad-ingress-nginx"
      port = "http"

      connect {
        sidecar_service {
          proxy {
            transparent_proxy {
              # Avoid an issue with the Envoy proxy: Nginx's default user UID is 101, the same as Envoy's.
              # This causes Envoy to ignore traffic instead of redirecting it to Nginx.
              uid = "102"
            }
          }
        }

        sidecar_task {
          user = "102"
        }
      }

      check {
        type     = "http"
        port     = "http"
        path     = "/health"
        interval = "5s"
        timeout  = "2s"
      }
    }

    task "nginx" {
      driver         = "docker"
      shutdown_delay = "10s"

      config {
        image = "docker.io/syaiful6/nginx-ingress:latest" # Private image; build your own.
        ports = ["http", "https"]
        volumes = [
          "local/conf.d:/etc/nginx/conf.d:ro",
          "local/nginx.conf:/etc/nginx/nginx.conf:ro"
        ]
      }

      volume_mount {
        volume      = "nginx-cert"
        destination = "/var/lib/acme/letsencrypt"
      }

      resources {
        cpu    = 512
        memory = 512
      }

      template {
        data        = <<EOF
load_module modules/ngx_http_acme_module.so;

user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;
    server_tokens off;

    #gzip  on;

    resolver 8.8.8.8 ipv6=off valid=5s;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    acme_issuer letsencrypt {
      uri https://acme-v02.api.letsencrypt.org/directory;
      contact you@example.com;
      state_path /var/lib/acme/letsencrypt;
      accept_terms_of_service;
    }

    acme_shared_zone zone=ngx_acme_shared:1M;

    # Global TLS settings, applied to every SSL-enabled server block.
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    server {
      listen 80 default_server;
      server_name _;

      location /health {
        default_type text/plain;
        return 200;
      }

      location / {
        # Serve a basic 404 response while listening for challenges.
        return 404;
      }
    }
    include /etc/nginx/conf.d/*.conf;
}
EOF
        destination = "local/nginx.conf"
      }

      # Generate an ingress catalog from Consul service metadata, then process it with render.py to generate the
      # configuration file.
      template {
        data        = <<EOF
{{- range services -}}
{{- with service .Name -}}
{{- with index . 0 -}}
{{- $meta := .ServiceMeta -}}
{{- if and (not (.Name | contains "sidecar-proxy")) (or (index $meta "nomad_ingress_enabled") (.Tags | contains "nomad_ingress_enabled=true")) -}}
{"name":{{ .Name | toJSON }},"meta":{{ $meta | toJSON }},"tags":{{ .Tags | toJSON }}}
{{ end -}}
{{- end -}}
{{- end -}}
{{- end -}}
EOF
        destination = "local/ingress-catalog.jsonl"
        change_mode = "script"

        change_script {
          command       = "/usr/local/bin/reload-ingress"
          timeout       = "45s"
          fail_on_error = false
        }
      }
    }
  }
}
```

I think the configuration is pretty much self-explanatory. It loads the ACME module and writes `ingress-catalog.jsonl`,
which the `render.py` script processes.

Before you deploy this, you need to create a volume to store the certificates that will be issued:

```
# Use a Nomad dynamic volume to store certificates.
type = "host"
name = "nginx-cert-store"
plugin_id = "mkdir"
```

Then apply it with `nomad volume create ./cert-store-volume.hcl`.

With everything in place, we can deploy it with `nomad job run nginx.hcl` as usual.

## Usage

With this implementation, I can deploy my HTTP services with the `nomad_ingress_enabled=true` tag, and the ingress will serve
them automatically. I can also define the `nomad_ingress_hostname` and `nomad_ingress_redirect_from` metadata to configure
TLS certificates and redirects from a non-www domain to its www counterpart.

```hcl
meta {
  nomad_ingress_enabled        = true
  nomad_ingress_hostname       = "www.example.com"
  nomad_ingress_redirect_from  = "example.com"
}
```

Your service must be deployed in bridge network mode with a transparent proxy sidecar.
You also need to allow the Nginx ingress to access the service with Consul intentions. Otherwise, the Nginx ingress will not
be able to connect to your service.

```hcl
Kind = "service-intentions"
Name = "your-service"

Sources = [
  {
    Name   = "nomad-ingress-nginx"
    Action = "allow"
  },
]
```

Apply this configuration with `consul config write your-service-intention.hcl`.

As it turns out, implementing a custom Nginx ingress for Nomad is not hard or complex. I hope this article helps you create
your own custom Nginx ingress.
