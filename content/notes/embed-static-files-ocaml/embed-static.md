---
title: "How to Embed Static Files in OCaml"
date: 2026-08-11
draft: false
tags: ["OCaml", "Web"]
---

I love how Go lets me [embed](https://pkg.go.dev/embed) static files into a binary. This solves the problem of bundling HTML templates,
CSS, JavaScript, and even SQL migration files — no need to ship separate files and folders.

Recently I was working on a project in OCaml and I wanted to do the same thing. I found a library called [ocaml crunch](https://github.com/mirage/ocaml-crunch).
This library does exactly what I wanted — it allows converting a filesystem into a static OCaml module.

Here is how to use it. Suppose we have the following directory structure:

```
- assets/
  - data/ <-- we want to embed this directory
    - file1.txt
    - file2.txt
  - dune
```

In your `assets/dune` file, you can add the following lines:

```dune
(rule
 (deps
  (source_tree data))
 (targets assets.ml)
 (action
  (run ocaml-crunch -m plain -o %{targets} ./data)))
```

This tells dune to track the `data` directory and run ocaml-crunch, which will generate assets.ml for us.

After that rule, we can add the library stanza as usual:

```dune
(rule
 (deps
  (source_tree data))
 (targets assets.ml)
 (action
  (run ocaml-crunch -m plain -o %{targets} ./data)))

(library
 (name project_assets)
 (public_name project.assets))
```

The generated module has the following signature:

```ocaml
sig
  val file_list : string list
  val read : string -> string option
  val hash : string -> string option
  val size : string -> int option
end
```
