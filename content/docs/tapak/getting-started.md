+++
title = 'Getting started'
date = '2026-08-28'
draft = false
description = 'Install Tapak and run your first application.'
project = 'tapak'
weight = 10
+++

Tapak is not on Opam yet (soon!). Until then, install it by pinning the Git
repository or by using Nix.

### Install with Opam

```
# Tapak use cows for websocket
opam pin add cows https://github.com/syaiful6/cows.git
opam pin add tapak https://github.com/syaiful6/tapak.git

# Install dependencies and build
opam install cows tapak --deps-only
```

Instead of pinning manually, add this to your Opam file:

```
pin-depends: [
  ["cows", "git+https://github.com/syaiful6/cows.git"]
  ["tapak", "git+https://github.com/syaiful6/tapak.git"]
]
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

## Hello World

Put your first application in `bin/main.ml`. Here is the usual hello world:

```ocaml
let app () =
  Tapak.Router.(
      of_list
        [ get (s "") |> unit |> into (fun () ->
            Tapak.html ~status:`OK "<h1>Hello, Tapak!</h1>")
        ])

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
    (app ())
```

Then create a dune file in `bin/dune`.

```dune
(executable
  (name main)
  (public_name your_project)
  (libraries tapak eio eio_main logs logs.fmt logs.cli fmt.tty logs.threaded))
```

Run the application with dune.

```
dune exec your_project
```

Open `http://localhost:3000` in your browser. You should see "Hello, Tapak!".
