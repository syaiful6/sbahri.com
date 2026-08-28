+++
title = 'Tapak'
date = '2025-10-01'
draft = false
description = 'Tapak is a composable framework for building web applications in OCaml'
language = 'OCaml'
tech_stack = []
github_url = 'https://github.com/syaiful6/tapak'
featured = true
+++

Tapak is a type-safe, contract-first web framework for OCaml 5, built on Eio. It pairs direct-style concurrency with
type-checked routing and generates OpenAPI documents from your route definitions. It provides:

- Type-level routing: declare the inputs your handler takes, and Tapak extracts and parses them from the path, query
parameters, cookies, headers, and body. The types stay checked end to end.
- Request validation: define a schema once and get parsing, validation, and error responses from it.
- Realtime communication: built-in WebSocket and Server-Sent-Events support.
- OpenAPI documentation: generated from your route definitions, so the docs match the routes they describe.

## Installation

Tapak is not on Opam yet (soon!). Until then, install it by pinning the Git repository or by using Nix.

### Install with Opam

```
opam pin add cows https://github.com/syaiful6/cows.git
opam pin add tapak https://github.com/syaiful6/tapak.git

# Install dependencies and build
opam install tapak --deps-only
```

### Install with Nix

Add Tapak as flake input in your `flake.nix`:

```nix
{
  inputs = {
    tapak.url = "github:syaiful6/tapak";
  };
  outputs = { self, tapak, ... }: {
    # Use tapak in your development or package build
    # you know how to do this, you use nix btw.
  }
}
```

## Quick Start

This example wires up type-safe routing, a logging middleware, and Eio:

```ocaml
let home_handler () =
  Tapak.html ~status:`OK "<h1>Welcome to Tapak!</h1>"

let user_handler user_id =
  (* user_id is automatically parsed as int64 *)
  let html = Printf.sprintf "<h1>User %Ld</h1>" user_id in
  Tapak.html ~status:`OK html

let api_handler id name =
  (* Both id (int64) and name (string) are type-safe *)
  let json = Printf.sprintf {|{"user_id": "%Ld","name": "%s"}|} id name in
  Tapak.json ~status:`OK json

let app env =
  let now () = Eio.Time.now (Eio.Stdenv.clock env) in
  Tapak.(
    Router.(
      of_list
        [ get (s "") |> unit |> into home_handler
        ; get (s "users" / int64) |> into user_handler
        ; get (s "api" / s "users" / int64 / str) |> into api_handler
        ])
    |> use
         (module Middleware.Request_logger)
         (Middleware.Request_logger.args ~now ~trusted_proxies:[] ()))

let () =
  Eio_main.run @@ fun env ->
  Eio.Switch.run @@ fun sw ->
  let port = 3000 in
  let address = `Tcp (Eio.Net.Ipaddr.V4.any, port) in
  let socket =
    Eio.Net.listen ~reuse_addr:true ~backlog:1024 ~sw env#net address
  in
  Tapak.run
    ~on_error:(fun exn ->
      Log.warn (fun f -> f "Uncaught exception %s" (Printexc.to_string exn)))
    socket
    (app env)
```
