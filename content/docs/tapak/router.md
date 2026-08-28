+++
title = 'Routing'
date = '2026-08-28'
draft = false
description = 'Define type-safe routes and request extractors with Tapak.'
project = 'tapak'
weight = 20
+++

Routes define your application's endpoints. A Tapak handler usually does not
receive `Tapak.Request.t` directly; it receives values extracted from the
request and returns `Tapak.Response.t`.

Tapak's router is type-safe, so the route definition determines the arguments
that its handler must accept.

## Basic routing

```ocaml
(** All handlers below have type [unit -> Tapak.Response.t]. *)
let routes = Tapak.Router.(
  of_list
    [ get (s "") |> unit |> into home_handler
    ; post (s "") |> unit |> into home_post_handler
    ; put (s "") |> unit |> into home_put_handler
    ; delete (s "") |> unit |> into home_delete_handler
    ; patch (s "") |> unit |> into home_patch_handler
    ]
)
```

The router also provides `head` and `any`. Use `unit` when a handler does not
need any values from the request. `of_list` turns a list of routes into a
handler and accepts an optional `not_found` handler.

## Path parameters

Path captures are passed directly to the handler. In this example, `slug`
captures the second path segment and passes it as a `string`:

```ocaml
Tapak.Router.
  [ get (s "post" / slug)
    |> into (fun slug ->
      Tapak.html (Printf.sprintf "<h1>Post: %s</h1>" slug))
  ]
```

The built-in path captures are:

```ocaml
val int : (int -> 'a, 'a) path
val int32 : (int32 -> 'a, 'a) path
val int64 : (int64 -> 'a, 'a) path
val str : (string -> 'a, 'a) path
val bool : (bool -> 'a, 'a) path
val slug : (string -> 'a, 'a) path
val splat : (string list -> 'a, 'a) path
```

Use `s` for a literal segment and `/` to join segments. A `splat` captures the
remaining segments as a `string list`.

To define another kind of capture, use `Tapak.Router.custom`. Its parser
receives an offset and length into the original path string and returns `None`
when the segment is invalid.

```ocaml
let uuid : (Uuidm.t -> 'a, 'a) Tapak.Router.path =
  Tapak.Router.custom
    ~parse:(fun ~off ~len s ->
      let str = String.sub s off len in
      Uuidm.of_string str)
    ~format:Uuidm.to_string
    ~type_name:"string"
    ~format_name:"uuid"
    ()
```

For a capture with a fixed set of allowed values, use `Tapak.Router.enum`.

## Extracting headers, query parameters, cookies, and bodies

Tapak uses `Sch.t` schemas to decode and validate request data before invoking
the handler:

```ocaml
type filter =
  { query : string option
  ; category : int option
  ; tag : string list
  }

let schema =
  Sch.Object.(
    define ~kind:"SearchFilter"
    @@
    let+ query = mem_opt ~enc:(fun { query; _ } -> query) "q" Sch.string
    and+ category =
      mem_opt ~enc:(fun { category; _ } -> category) "category" Sch.int
    and+ tag =
      mem ~default:[] ~enc:(fun { tag; _ } -> tag) "tag" (Sch.list Sch.string)
    in
    { query; category; tag }
  )

let routes = Tapak.Router.
  [ get (s "posts")
    |> query schema
    |> into (fun filter ->
      Tapak.json (Sch.Json.encode_string schema filter))
  ; put (s "posts" / int)
    |> body Json schema
    |> into (fun filter _id ->
      Tapak.json (Sch.Json.encode_string schema filter))
  ]
```

Each extractor prepends its value to the handler's existing argument list. In
the `put` route above, that puts the body value before the path's `id`
argument.

The relevant API is:

```ocaml
type media_type =
  | Json
  | Urlencoded
  | Multipart

val body : media_type -> 'a Sch.t -> ('b, 'c) schema -> ('a -> 'b, 'c) schema
val query : 'query Sch.t -> ('a, 'b) schema -> ('query -> 'a, 'b) schema
val header : 'a Sch.t -> ('b, 'c) schema -> ('a -> 'b, 'c) schema
val cookie : 'a Sch.t -> ('b, 'c) schema -> ('a -> 'b, 'c) schema
```

If you need the unprocessed request, use `request`. If no input is needed, use
`unit`.

## Custom extractors

Tapak also lets you define a custom extractor that reads a request and passes a
value to the handler. For example, an extractor can retrieve the currently
authenticated user:

```ocaml
type user =
  { id : int
  ; name : string
  ; role : string
  }

let user_schema =
  Sch.Object.(
    define ~kind:"User"
    @@
    let+ id = mem ~enc:(fun u -> u.id) "id" Sch.int
    and+ name = mem ~enc:(fun u -> u.name) "name" Sch.string
    and+ role = mem ~enc:(fun u -> u.role) "role" Sch.string in
    { id; name; role })

(** Define custom extractor errors so they can be handled later. *)
type Tapak.Router.extractor_error +=
  | Invalid_bearer_token
  | Missing_auth_header
  | Invalid_token

let user : user Tapak.Router.extractor =
 fun req ->
  match Tapak.Request.header "Authorization" req with
  | Some auth when String.starts_with ~prefix:"Bearer " auth ->
      let token = String.sub auth 7 (String.length auth - 7) in
      (* In a real application, validate the token and query the database. *)
      if token = "valid-token"
      then Ok { id = 1; name = "Alice"; role = "admin" }
      else if token = "user-token"
      then Ok { id = 2; name = "Bob"; role = "user" }
      else Error Invalid_token
  | Some _ -> Error Invalid_bearer_token
  | None -> Error Missing_auth_header

let routes = Tapak.Router.
  [ get (s "profile")
    |> extract user
    |> into (fun user ->
      Tapak.json (Sch.Json.encode_string user_schema user))
  ]
```

An extractor returns `Ok value` or `Error extractor_error`. During routing,
Tapak raises the error as `Tapak.Router.Extraction_failed error`; middleware can
catch it and turn it into a response.
