# Post-template starter

When the user says "let's start a new post about X" and there isn't a
clearer pattern in their first message, scaffold from this. Replace
{...} placeholders.

## Front-matter the API expects

Not literally front-matter — this is the JSON shape sent to `/api/posts`:

```json
{
  "title": "{a claim, an object, or a name + verb}",
  "slug": "{lowercased-hyphenated; or omit and let the API derive}",
  "tags": ["{primary}", "{secondary}"],
  "status": "draft",
  "excerpt": "{optional pullquote — leave null to use first paragraph}",
  "body": "{the markdown}"
}
```

## Body shape that fits the design

The site renders the first paragraph with a drop-cap. Make the first
sentence count. After that, paragraphs flow normally; `##` and `###`
get heavy display treatment; `>` blockquotes turn red and uppercase
(use sparingly).

```markdown
{First sentence carries the post. Strong, declarative.} {Second
sentence orients the reader without explaining why they should care.}

{Body paragraphs.}

## {Section head if needed — sentence case, will render uppercase}

{...}

> {Pullquote — render as a red-bordered display block. One per post,
> max two.}

{Body continues.}

{Closing — usually short. Land it.}
```

## Tag picking

If unclear, ask "tag as: {two-or-three-suggestions}?" and accept the
user's call. Never tag with more than three.
