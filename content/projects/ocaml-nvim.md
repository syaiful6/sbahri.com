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

OCaml.nvim is a Neovim plugin designed to enhance the OCaml development experience by providing intelligent sandbox detection, LSP integration, and comprehensive filetype support.

## ✨ Features

- **🎯 Smart LSP Integration**: Automatic detection and setup of `ocamllsp`
  with sandbox support
- **📦 Sandbox Detection**: Supports esy projects with automatic command
  resolution
- **🎨 Multiple Filetypes**: Support for OCaml, Reason, and various OCaml
  file formats
- **🔧 Automatic Formatting**: Integration with `ocamlformat` and
  `ocamlformat-mlx` via conform.nvim
- **🌳 TreeSitter Integration**: Enhanced syntax highlighting and code
  understanding
- **⚡ Performance**: Efficient client reuse and project detection

## 📁 Supported File Types

| Extension | Language | Description |
|-----------|----------|-------------|
| `.ml` | `ocaml` | OCaml implementation files |
| `.mli` | `ocaml.interface` | OCaml interface files |
| `.mll` | `ocaml.ocamllex` | OCaml lexer files |
| `.mly` | `ocaml.menhir` | Menhir parser files |
| `.mlx` | `ocaml.mlx` | OCaml JSX files |
| `.t` | `ocaml.cram` | Cram test files |
| `.re` | `reason` | Reason implementation files |
| `.rei` | `reason` | Reason interface files |
