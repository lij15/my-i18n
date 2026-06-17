# SAP CAP — Internationalization (i18n)

CAP provides built-in i18n support through `.properties` files in the `_i18n` directory. The framework automatically selects the correct language based on the `Accept-Language` header — no extra configuration needed.

---

## How It Works

```
HTTP request + Accept-Language: zh
        ↓
CDS model annotation: @title: '{i18n>BookTitle}'
        ↓
CAP looks up _i18n/i18n_zh.properties
        ↓
$metadata returns: <Annotation Term="Common.Label" String="书名"/>
```

---

## Two Separate i18n Systems in CAP

This is the most important thing to understand before starting:

| System | Files | Location | Purpose |
|---|---|---|---|
| `{i18n>Key}` in `.cds` | `i18n_*.properties` | Your project's `_i18n/` | Labels in `$metadata` (`@title`, `@description`) |
| `cds.i18n.messages` | `messages_*.properties` | `node_modules/@sap/cds/_i18n/` | CAP framework internal system messages |

These two are completely independent. `cds.i18n.messages.at()` will **never** return your project's translations — it only reads the framework's own `messages_*.properties` files. For business logic in `.js` handlers, you need to read the `_i18n/i18n_*.properties` files yourself.

---

## Project Structure

```
my-i18n/
├── _i18n/
│   ├── i18n.properties        ← default language (English, required)
│   ├── i18n_de.properties     ← German
│   ├── i18n_zh.properties     ← Chinese
│   └── i18n_ja.properties     ← Japanese
├── db/
│   ├── schema.cds
│   └── data/
│       └── my.i18n-Books.csv
├── srv/
│   ├── cat-service.cds
│   └── cat-service.js
└── package.json
```

---

## i18n File Naming Rules

```bash
# Verify with:
cds env i18n
# → { file: 'i18n', folders: ['_i18n', 'i18n'], ... }
```

The `file` field tells you the required filename prefix — in this project it's `i18n`.

```
_i18n/i18n.properties          ← default/fallback (must exist)
_i18n/i18n_de.properties       ← German     (ISO 639-1 code)
_i18n/i18n_zh.properties       ← Chinese
_i18n/i18n_zh_CN.properties    ← Simplified Chinese (region variant)
_i18n/i18n_ja.properties       ← Japanese
```

Matching order for `Accept-Language: zh-CN`:
```
1. i18n_zh_CN.properties   ← exact match
2. i18n_zh.properties      ← language fallback
3. i18n.properties         ← default fallback
```

---

## i18n File Format

```properties
# Comments start with #
# Key=Value (no spaces around =)

BookTitle=Book Title
Price=Price
Stock=Stock Quantity
Author=Author
Category=Category

Action_OutOfStock=Out of stock
Action_PublishSuccess=Book published successfully
```

```properties
# i18n_zh.properties
BookTitle=书名
Price=价格
Stock=库存数量
Author=作者
Category=分类

Action_OutOfStock=缺货
Action_PublishSuccess=书籍发布成功
```

```properties
# i18n_de.properties
BookTitle=Buchtitel
Price=Preis
Stock=Lagerbestand
Author=Autor
Category=Kategorie

Action_OutOfStock=Nicht vorrätig
Action_PublishSuccess=Buch erfolgreich veröffentlicht
```

```properties
# i18n_ja.properties
BookTitle=書籍名
Price=価格
Stock=在庫数
Author=著者
Category=カテゴリー

Action_OutOfStock=在庫切れ
Action_PublishSuccess=書籍が正常に公開されました
```

---

## Data Model

### `db/schema.cds`

```cds
namespace my.i18n;
using { cuid, managed } from '@sap/cds/common';

entity Books : cuid, managed {
  title    : String(200);
  price    : Decimal(9, 2);
  stock    : Integer default 0;
  author   : String(100);
  category : String(20);
}
```

---

## Service Definition

### `srv/cat-service.cds`

```cds
using my.i18n as db from '../db/schema';

service CatalogService {
  entity Books as projection on db.Books;

  entity Books actions {
    action publish() returns { message: String; };
  };
}

annotate CatalogService.Books with {
  // {i18n>Key} references a key in _i18n/i18n_*.properties
  // CAP automatically selects the right file based on Accept-Language
  title    @title: '{i18n>BookTitle}';
  price    @title: '{i18n>Price}';
  stock    @title: '{i18n>Stock}';
  author   @title: '{i18n>Author}';
  category @title: '{i18n>Category}';
}
```

---

## Service Implementation

### `srv/cat-service.js`

```js
const cds = require('@sap/cds')
const path = require('path')
const fs = require('fs')

// Read _i18n/i18n_*.properties files manually
// cds.i18n.messages is the framework's INTERNAL bundle — it never contains
// your project's translations. There is no public CAP API for reading
// project i18n files from JS handlers, so we parse the files directly.
function loadProperties(locale) {
  const filename = (!locale || locale === 'en')
    ? 'i18n.properties'
    : `i18n_${locale}.properties`

  const filepath = path.join(__dirname, '..', '_i18n', filename)

  if (!fs.existsSync(filepath)) {
    // Locale not found — fall back to default
    return loadProperties('en')
  }

  const content = fs.readFileSync(filepath, 'utf-8')
  const messages = {}
  content.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const idx = line.indexOf('=')
    if (idx === -1) return
    messages[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return messages
}

module.exports = class CatalogService extends cds.ApplicationService {
  async init() {
    const { Books } = this.entities

    this.on('publish', Books, async req => {
      const id = req.params[0].ID
      const book = await SELECT.one.from(Books).where({ ID: id })
      if (!book) return req.error(404, 'Book not found')

      // req.locale is populated from the Accept-Language header
      console.log('Current locale:', req.locale)

      const messages = loadProperties(req.locale)

      if (book.stock === 0) {
        return req.error(409, messages['Action_OutOfStock'])
      }

      return { message: `${messages['Action_PublishSuccess']}: "${book.title}"` }
    })

    return super.init()
  }
}
```

---

## Running the Project

```bash
cds watch
```

---

## HTTP Request Examples

### Check current i18n configuration
```bash
cds env i18n
# → { file: 'i18n', folders: ['_i18n', 'i18n'], default_language: 'en', ... }
```

### $metadata — default language (English)
```http
GET /odata/v4/catalog/$metadata
```
```xml
<Annotation Term="Common.Label" String="Book Title"/>
```

### $metadata — German
```http
GET /odata/v4/catalog/$metadata
Accept-Language: de
```
```xml
<Annotation Term="Common.Label" String="Buchtitel"/>
```

### $metadata — Chinese
```http
GET /odata/v4/catalog/$metadata
Accept-Language: zh
```
```xml
<Annotation Term="Common.Label" String="书名"/>
```

### publish action — multilingual error message (stock = 0)
```http
POST /odata/v4/catalog/Books(ID=b0000001-0000-0000-0000-000000000002)/publish
Accept-Language: zh
Content-Type: application/json
{}
# → 409 缺货
```

```http
POST /odata/v4/catalog/Books(ID=b0000001-0000-0000-0000-000000000002)/publish
Accept-Language: ja
Content-Type: application/json
{}
# → 409 在庫切れ
```

```http
POST /odata/v4/catalog/Books(ID=b0000001-0000-0000-0000-000000000002)/publish
Accept-Language: de
Content-Type: application/json
{}
# → 409 Nicht vorrätig
```

### publish action — success message
```http
POST /odata/v4/catalog/Books(ID=b0000001-0000-0000-0000-000000000001)/publish
Accept-Language: de
Content-Type: application/json
{}
# → { "message": "Buch erfolgreich veröffentlicht: \"Clean Code\"" }
```

---

## Summary

| Use case | How |
|---|---|
| Field labels in `$metadata` | `@title: '{i18n>Key}'` in `.cds` — CAP handles automatically |
| Business messages in `.js` handlers | `loadProperties(req.locale)` — read files manually |
| Current request locale | `req.locale` (e.g. `'zh'`, `'de'`) |
| i18n config | `cds env i18n` |

---

## Gotchas

**File naming prefix must match `cds env i18n` → `file` field**
```bash
cds env i18n
# → { file: 'i18n', ... }   ← prefix is 'i18n'

# ✅ correct
_i18n/i18n.properties
_i18n/i18n_zh.properties

# ❌ wrong prefix — CAP won't find these
_i18n/messages.properties
_i18n/messages_zh.properties
```

**`cds.i18n.messages` is the framework's INTERNAL bundle — never use it for project translations**
```js
// ❌ This reads node_modules/@sap/cds/_i18n/messages_*.properties
cds.i18n.messages.at('Action_OutOfStock', 'zh')  // → undefined

// ✅ Read your own _i18n/i18n_*.properties directly
const messages = loadProperties(req.locale)
messages['Action_OutOfStock']  // → '缺货'
```

**`{i18n>Key}` only works in `.cds` annotations — not in `.js` code**
```cds
// ✅ This works — CAP processes it when generating $metadata
title @title: '{i18n>BookTitle}';
```
```js
// ❌ This is just a literal string — CAP won't translate it
return req.error(409, '{i18n>Action_OutOfStock}')

// ✅ Load the translated string yourself
const messages = loadProperties(req.locale)
return req.error(409, messages['Action_OutOfStock'])
```

**`_i18n` file changes are not hot-reloaded — restart `cds watch` after renaming files**
```bash
# After renaming or adding .properties files:
# Ctrl+C to stop, then restart
cds watch
```

**`$metadata` is cached — test i18n changes in a new browser tab or with a REST client**
