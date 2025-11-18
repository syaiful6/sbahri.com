+++
title = 'OCaml.nvim'
date = '2025-08-08'
draft = false
description = 'A comprehensive Neovim plugin for OCaml development with intelligent sandbox detection, LSP integration, and comprehensive filetype support'
language = 'Lua'
tech_stack = []
github_url = 'https://github.com/syaiful6/ocaml.nvim'
featured = true
+++

OCaml.nvim is a [Neovim](https://neovim.io/) plugin I started developing because I wanted a better experience
when working with OCaml projects.

OCaml tools like `ocaml-lsp-server`, `ocamlformat`, and `dune` are often managed by a sandbox, such as Opam or Esy.
Project dependencies and tool versions are managed within these sandboxes to ensure consistency and isolation.
This is usually great for development, but it poses challenges for editor integration.

I always found myself manually sourcing the sandbox environment before launching Neovim to ensure the tools were
available. This process is tedious and error-prone, especially when switching between projects with different sandboxes.

In VS Code, the [OCaml Platform extension](https://marketplace.visualstudio.com/items?itemName=ocamllabs.ocaml-platform)
handles this automatically by detecting the sandbox and launching the language server within it, allowing users to easily select the correct
sandbox when opening a project.

This is what OCaml.nvim aims to achieve for Neovim users. It automatically detects the sandbox type (Opam or Esy)
when opening an OCaml project and configures the language server and other tools to run within that sandbox.

If it can't find a sandbox, it falls back to the global environment, which is often the case for Nix users.

Over time, I've added more features to the plugin, including useful commands for interacting with [OCaml LSP](https://github.com/ocaml/ocaml-lsp)
and Merlin, as well as filetype support for ReasonML, Menhir, and MLX.

For example, you can summon odoc documentation directly from the editor without hovering over the symbol:

<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="en" dir="ltr">I&#39;ve been performing the &#39;LSp Hover Dance&#39; to summon odoc documentation.<br><br>I just found out OCaml Lsp has a feature to get it directly. 🤣 <a href="https://t.co/6wRzhlpNaU">pic.twitter.com/6wRzhlpNaU</a></p>&mdash; Syaiful Bahri (@kicauipul) <a href="https://twitter.com/kicauipul/status/1987911095215095898?ref_src=twsrc%5Etfw">November 10, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

You can also select the AST node enclosing the cursor position:

<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="en" dir="ltr"><a href="https://twitter.com/hashtag/OCaml?src=hash&amp;ref_src=twsrc%5Etfw">#OCaml</a> LSP has a useful feature: ocamllsp/wrappingAstNode. In Neovim, this lets you select the AST node enclosing your cursor. Binding it to a key makes selecting entire functions, modules, etc., much quicker. <a href="https://t.co/jmqDte8o8q">pic.twitter.com/jmqDte8o8q</a></p>&mdash; Syaiful Bahri (@kicauipul) <a href="https://twitter.com/kicauipul/status/1982454793382883805?ref_src=twsrc%5Etfw">October 26, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Check out the [GitHub repository](https://github.com/syaiful6/ocaml.nvim) for more information.
Feel free to open issues or contribute!
