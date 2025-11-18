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

When I started learning OCaml, I wanted to build web applications using the language. However,
the existing web frameworks at the time, [Opium](https://github.com/rgrinberg/opium/tree/master/opium)
and [Dream](https://github.com/camlworks/dream), were designed as **normal** web frameworks just like
those in other languages.

Both depend on [Lwt](https://ocsigen.org/lwt/latest/manual/manual) for their asynchronous programming model—
a monad that is not very beginner-friendly. Since OCaml already supports algebraic effects, and [EIO](https://github.com/ocaml-multicore/eio)
for direct-style concurrency is already stable, why not leverage that instead?

So I decided to explore building my own web framework built upon EIO, providing more modern features
I found lacking in existing frameworks. Let me introduce you to **Tapak**.

## The Problem with Traditional Routing

Traditional routing APIs require you to manually extract and parse parameters:

```ocaml
Dream.get "/users/:id/posts/:slug" (fun request ->
  let user_id = Dream.param request "id" |> Int64.of_string in
  let slug = Dream.param request "slug" in
  handler user_id slug request)
```

Problems with this approach:

- Parameters come as strings, requiring manual parsing
- Type mismatches only caught at runtime
- Easy to typo parameter names
- No compile-time guarantees

Here's how Tapak solves this:

```ocaml
(* Tapak: type-safe parameter extraction *)
get (s "users" / int64 / s "posts" / str) @-> fun user_id slug req ->
  handler user_id slug req
  (* user_id is already int64! slug is already string! *)
```

The magic? The compiler knows `user_id` is `int64` and `slug` is `string`. If you try to use them incorrectly,
you get a compile error, not a runtime crash.

I'm a newcomer to OCaml, so I didn't initially realize that GADTs make this possible. Let me show you how it works.

## Type-Safe Routing with GADTs

The core problem with traditional routing is that route parameters are extracted as strings and need to be manually
parsed and validated in the handler. This leads to runtime errors and boilerplate code.

What if we could encode the route structure directly in the type system, so the compiler can:

1. Validate that handlers receive the correct parameter types
2. Generate URLs from the same route definitions
3. Catch routing errors at compile time, not runtime

Here is how Tapak's routing system works under the hood.

```ocaml
type (_, _) path =
  | Nil : ('a, 'a) path
  | Literal : string * ('a, 'b) path -> ('a, 'b) path
  | Int64 : ('a, 'b) path -> (int64 -> 'a, 'b) path
  | String : ('a, 'b) path -> (string -> 'a, 'b) path
  | Method : Piaf.Method.t * ('a, 'b) path -> ('a, 'b) path
  (* ... more constructors *)
```

Key observations:

1. **Two type parameters**: `('a, 'b) path`
   - `'a`: The accumulated function type (builds up as we add parameters)
   - `'b`: The final return type

2. **Type threading**: Each constructor modifies the first type parameter to "accumulate" extracted values

Let's see how this works in practice:

```ocaml
get (s "users" / int64) @-> user_handler
```

Type evolution:

1. `s "users"` → `('a, 'a) path` (no parameters extracted)
2. `/ int64` → `(int64 -> 'a, 'a) path` (adds int64 parameter)
3. `get` → Wraps in Method GET
4. `@-> user_handler` → Requires handler of type `int64 -> Request.t -> Response.t`

### Composing Routes with the `/` Operator

```ocaml
let rec ( / ) : type a b c. (a, c) path -> (c, b) path -> (a, b) path =
 fun left right ->
  match left with
  | Nil -> right
  | Literal (lit, rest) -> Literal (lit, rest / right)
  | Int64 rest -> Int64 (rest / right)
  | String rest -> String (rest / right)
  (* ... *)
```

The `/` operator **composes** paths by recursively threading the right side into the left side's `rest` parameter.
This is how we chain multiple segments together.

### Pattern Matching and Extraction

**Tapak's Runtime Matching**:

```ocaml
let rec match_pattern : type a b.
  (a, b) path -> string list -> Request.t -> a -> b option
  =
 fun pattern segments request k ->
  match pattern, segments with
  | Nil, [] -> Some k
  | Literal (expected, rest), seg :: segs when String.equal expected seg ->
    match_pattern rest segs request k
  | Int64 rest, seg :: segs ->
    (match parse_int64 seg with
    | Some n -> match_pattern rest segs request (k n)  (* Apply extracted value to continuation *)
    | None -> None)
  | String rest, seg :: segs -> match_pattern rest segs request (k seg)
  (* ... *)
```

The key insight: `k` is a **continuation** (the handler function). As we extract parameters, we apply them to `k`,
building up the final function call.

For `get (s "users" / int64) @-> fun id req -> ...`:

1. Match `"users"` → continue with same `k`
2. Parse `"123"` as `int64` → apply to `k`, getting `k 123L`
3. Reach `Nil` → return `Some (k 123L request)`, which evaluates the handler

### Request Guards

I've been working on web applications since my early career, and one common pattern is validating requests—
like requiring certain headers, authentication, or specific content types. This is usually handled outside the routing API.

Surely, we can add middleware for that. But we can't express it in the type system, leading to potential mismatches.
I've screwed up a few times where I forgot to attach the correct authentication middleware to a route.
It's also not particularly clear just by looking at the handler definition. It's much clearer to me if the handler is declared like:

```ocaml
let admin_handler user req = ...
```

The `user` parameter explicitly tells me this handler requires an authenticated user. The routing system should
only call this handler if the request is authenticated. I found this pattern really useful! Don't you think so?

So I decided to add **Request Guards** to Tapak's routing system. Here's how it looks:

```ocaml
let ( >=> ) : type a b g. g Request_guard.t -> (a, b) path -> (g -> a, b) path =
 fun guard pattern -> Guard (guard, pattern)
```

Usage example:

```ocaml
get (user_guard >=> s "users" / int64) @-> fun user id req ->
  (* user : User.t, id : int64, req : Request.t *)
  Response.of_string ~body:(Printf.sprintf "User %s viewing %Ld" user.name id) `OK
```

Guards add **validated data extraction** before path matching. The type `(g -> a, b) path` shows that the guard's result (`g`)
becomes the first parameter.

**Composing multiple guards:**

Request guards are just normal functions! So we can compose them naturally. Tapak provides combinators to help with that.

Their definition is straightforward:

```ocaml
type error = ..

type 'a t = Request.t -> ('a, error) result
```

An example combinator to combine two guards. Both must succeed, and their results are combined into a tuple.

```ocaml
(* &&& combinator combine two guards, both must succeed *)
let authenticated_json = Request_guard.(user_guard &&& json_body) in

post (authenticated_json >=> s "api" / s "posts") @-> fun (user, json_data) req ->
  (* user: User.t, json_data: Json.t, req: Request.t *)
  create_post user json_data
```

### URL Generation

```ocaml
let rec sprintf' : type a. (a, string) path -> string -> a =
 fun pattern acc ->
  match pattern with
  | Nil -> acc
  | Literal (s, rest) -> sprintf' rest (acc ^ "/" ^ s)
  | Int64 rest -> fun n -> sprintf' rest (acc ^ "/" ^ Int64.to_string n)
  | String rest -> fun s -> sprintf' rest (acc ^ "/" ^ s)
  (* ... *)

(* Usage *)
let user_path = s "users" / int64
let url = sprintf user_path 42L  (* "/users/42" *)
```

The same GADT that validates handlers also generates URLs!

### Pros and Cons of GADT-Based Routing

To be honest, GADT-based routing is not without trade-offs. So let's discuss the advantages and disadvantages.

**Advantages:**

1. **Compile-time safety** - Wrong parameter types caught immediately

   ```ocaml
   get (s "users" / int64) @-> fun id req ->
     String.length id  (* Compile error: id is int64, not string! *)
   ```

2. **No runtime parsing errors** - If it compiles, parameters are the correct type
3. **Self-documenting** - Route definitions show exactly what types handlers expect
4. **URL generation** - Generate URLs from the same definition, guaranteed to match
5. **Composability** - Routes are first-class values you can pass around
6. **Refactoring safety** - Change a route type, compiler finds all affected handlers

**Trade-offs:**

1. **Learning curve** - GADTs are more advanced than string-based routing
2. **Compile times** - Heavy GADT usage can increase compilation time
3. **Error messages** - Type errors with GADTs can be cryptic for beginners
4. **Less dynamic** - Can't build routes from runtime data as easily
5. **Overkill for simple apps** - For a 3-route API, string routing is simpler

**When to use Tapak's routing:**

- Medium to large applications with many routes
- Teams that value type safety and refactorability
- APIs that need guaranteed URL generation
- Projects where compile-time errors > runtime errors

**When traditional routing might be better:**

- Small scripts or prototypes with few routes
- Teams unfamiliar with GADTs
- Applications requiring very dynamic routing

### Example: RESTful Resources

Tapak even provides high-level abstractions:

```ocaml
module UserResource : Router.Resource = struct
  type id = int64
  let id_path () = Router.int64

  let index _req =
    Response.of_json ~body:{|{"users": [...]}|} `OK

  let get id _req =
    Response.of_json ~body:(Printf.sprintf {|{"id": %Ld, ...}|} id) `OK

  let create _req =
    Response.of_json ~body:{|{"created": true}|} `Created

  let update id _req =
    Response.of_json ~body:(Printf.sprintf {|{"id": %Ld, "updated": true}|} id) `OK

  let delete id _req =
    Response.empty `No_content

  let new_ _req =
    Response.of_html ~body:"<form>...</form>" `OK

  let edit id _req =
    Response.of_html ~body:(Printf.sprintf "<form data-id='%Ld'>...</form>" id) `OK
end

let routes = resource (s "users") (module UserResource)
(* Generates all 7 RESTful routes automatically! *)
```

### Routing Scope

Most web frameworks provide a way to group routes under a common prefix or apply middleware.
This is usually called "scopes" or "namespaces," and it's useful for organizing routes,
applying common middleware, or versioning APIs.

Tapak provides routing scopes as well:

```ocaml
App.(
    routes
      ~not_found
      [ get (s "") @-> home_handler
      ; get (s "users" / int64) @-> user_handler
      ; scope
          ~middlewares:[api_auth_middleware]
          (s "api")
          [ get (s "version") @-> api_version_handler
          ; scope
              ~middlewares:
                [ require_email_confirmed_middleware
                ]
              (s "users")
              [ get (s "") @-> api_users_handler
              ; get int64 @-> api_detail_user_handler
              ; post int64 @-> api_update_user_handler
              ]
          ]
       ]
    ()

```

## Static File Serving

Another feature I found lacking in other web frameworks is robust static file serving. Both Opium and Dream
provide static file serving, but they simply serve files from a directory without supporting
range requests, conditional requests, caching headers, and other optimizations that are important for
serving static files efficiently.

They also lack flexibility. What if I want to serve files from embedded resources, from a CDN,
or generate files on the fly?

This is why I decided to implement a more robust static file serving solution in Tapak.

The API looks like this:

```ocaml
let cwd = Eio.Stdenv.cwd env in
let public_dir = Eio.Path.(cwd / "examples" / "static-files" / "public") in
let fs_backend = Static.filesystem ~follow:false public_dir in
let static_config =
  { Static.default_config with
    max_age = `Seconds 3600 (* Cache for 1 hour *)
  ; use_weak_etags = true
  ; serve_hidden_files = false
  ; follow_symlinks = false
  ; index_files = [ "index.html"; "index.htm" ]
  }
in
let app =
  App.(
    routes
      [ get (s "static" / splat) @-> Static.serve fs_backend ~config:static_config () ]
      ()
  )
```

The `fs_backend` is a static file backend that serves files from the filesystem. It can be replaced with other backends
by implementing Tapak's Static STORAGE module signature. For example, I can implement an embedded file backend generated
by [OCaml-crunch](http://github.com/mirage/ocaml-crunch).

## Realtime APIs with WebSockets and SSE

Nowadays, many web applications require realtime features like chat, notifications, and live updates.

This is usually achieved using WebSockets or Server-Sent Events (SSE). I already support SSE in Tapak, and WebSockets
are supported through [Piaf](https://github.com/anmonteiro/piaf), which Tapak is built upon.

But I want to provide a more ergonomic API for building realtime features in Tapak. My vision is to have an API
similar to Elixir's [Phoenix Channels](https://hexdocs.pm/phoenix/channels.html), with the goal of using their JavaScript client
to connect to the Tapak server. This is still a work in progress—stay tuned!

## Conclusion

This is what I've built so far with Tapak. It's still a work in progress and an experiment on what an OCaml web framework
could look like when built on modern OCaml with everything I've learned so far. But I'm excited about the possibilities!

The GADT-based routing system shows that type safety and ergonomics don't have to be at odds. By encoding routes in the
type system, we get both compile-time guarantees and a clean, composable API.

## Getting Started

Want to try Tapak? Here are some resources:

- **Documentation**: [https://syaiful6.github.io/tapak/](https://syaiful6.github.io/tapak/)
- **Source Code**: [https://github.com/syaiful6/tapak](https://github.com/syaiful6/tapak)
- **Examples**: [https://github.com/syaiful6/tapak/tree/main/examples](https://github.com/syaiful6/tapak/tree/main/examples)

**Installation:**

You can install Tapak using Opam by pinning the GitHub repository:

```bash
# Pin from GitHub
opam pin add tapak https://github.com/syaiful6/tapak.git

# Install dependencies
opam install tapak --deps-only
```

or you can use Nix Flakes. Add Tapak as a flake input in your `flake.nix`:

```nix
{
  inputs = {
    tapak.url = "github:syaiful6/tapak";
    # Or specify a branch:
    # tapak.url = "github:syaiful6/tapak/main";
  };

  outputs = { self, tapak, ... }: {
    # Use tapak in your development environment or package build
    # you know how to do this, you use nix btw.
  };
}
```

The framework is still experimental, so feedback and contributions are very welcome! If you try it out or have questions,
feel free to open an issue on GitHub.
