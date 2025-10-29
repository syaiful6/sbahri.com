+++
title = 'Tapak'
date = '2025-10-01'
draft = false
description = 'Tapak is a composable framework for building web applications in OCaml'
language = 'OCaml'
tech_stack = []
github_url = 'https://github.com/syaiful6/tapak'
documentation_url = 'https://syaiful6.github.io/tapak/'
featured = true
+++

Tapak is a composable web framework for OCaml 5, built on EIO (effect-based I/O)
and inspired by [Twitter's Finagle](https://twitter.github.io/finagle/) architecture.

With OCaml 5's effect handlers and **EIO** (effect-based I/O), we now have a foundation
for writing concurrent code that is both ergonomic (direct style, no monads) and performant
(no heap allocations for context switching).

Tapak explores what a **modern, practical web framework** looks like when built on this foundation:

1. **Embraces modern OCaml**: OCaml 5 effects + EIO for direct-style concurrent code
2. **Type-safe from the ground up**: GADT-based routing with compile-time parameter checking
3. **Composable architecture**: Finagle's proven Service/Filter pattern for modularity
4. **Focused core**: Not batteries-included, compose what you need

Unlike **Dream** or **Opium** (Lwt-based with monadic code), Tapak uses EIO for direct-style
concurrency. Unlike **Eliom** (full-stack with client/server shared code), Tapak focuses on
server-side HTTP services with maximum composability.

This is an experiment in pushing the boundaries of typed functional web development
while keeping pragmatism and real-world usage in mind.
