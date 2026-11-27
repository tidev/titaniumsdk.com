---
title: Models & collections
description: Backbone models, the sync adapters that persist them, and binding a collection to a list.
since: 13.4.0
---

Alloy's data layer is Backbone. A model is a record with attributes and events;
a collection is a set of them. Alloy adds the persistence, through a **sync
adapter** you name per model.

Backbone 1.4.0 ships with Alloy 3.1.0, and the version is pinned in
`config.json`.

## Defining a model

```js
// app/models/note.js
exports.definition = {
  config: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      body: 'TEXT',
      done: 'INTEGER',
    },
    adapter: {
      type: 'sql',
      collection_name: 'notes',
      idAttribute: 'id',
    },
  },
  extendModel(Model) {
    _.extend(Model.prototype, {
      toggle() {
        this.save({ done: this.get('done') ? 0 : 1 });
      },
    });
    return Model;
  },
};
```

`columns` is the schema, and the adapter creates the table on first use.
`extendModel` and `extendCollection` are where behaviour goes, and both must
return what they were given.

## The three adapters

| `type`         | Stores in             | For                              |
| -------------- | --------------------- | -------------------------------- |
| `sql`          | A SQLite table        | Anything you query or that grows |
| `properties`   | `Ti.App.Properties`   | A small set that fits in memory  |
| `localStorage` | Web-storage semantics | Ported code that expects it      |

`sql` is the one to use unless you have a reason. `properties` serialises the
whole collection on every write, so it degrades as the collection grows rather
than failing outright, which makes the problem hard to spot.

## Using them

```js
const notes = Alloy.createCollection('note');

notes.fetch();

const note = Alloy.createModel('note', { body: 'Write the docs', done: 0 });
note.save();

notes.add(note);
```

`fetch` reads from the adapter and `save` writes. Neither is a network call
unless you wrote an adapter that makes one.

A singleton collection - one shared instance - is `Alloy.Collections.note`,
created on first access. Use it when several screens must see the same data,
and `Alloy.createCollection` when they should not.

## Binding a collection to a list

This is the part that pays for the framework. Declare the collection in the
view and rows follow the data:

```xml
<Alloy>
  <Collection src="note" />
  <Window>
    <ListView defaultItemTemplate="noteRow">
      <Templates>
        <ItemTemplate name="noteRow">
          <Label bindId="body" />
        </ItemTemplate>
      </Templates>
      <ListSection dataCollection="note">
        <ListItem body:text="{body}" />
      </ListSection>
    </ListView>
  </Window>
</Alloy>
```

`dataCollection` names the collection, and `{body}` reads that attribute from
each model. Adding a model to the collection adds a row; removing one removes
the row. No list code in the controller at all.

`dataFilter` and `dataTransform` narrow and reshape:

```xml
<ListSection dataCollection="note" dataFilter="onlyOpen" dataTransform="forRow">
```

```js
function onlyOpen(collection) {
  return collection.where({ done: 0 });
}

function forRow(model) {
  const row = model.toJSON();
  row.body = row.body.toUpperCase();
  return row;
}
```

`dataTransform` runs per row on every change, so keep it cheap.

> [!IMPORTANT]
> Binding keeps a reference from the collection to the view. A controller that
> binds and is then discarded without `$.destroy()` leaves the binding alive,
> and the collection goes on updating a view nobody can see. See
> [controllers](/docs/alloy/controllers).

## Migrations

A migration changes the schema of a `sql` model between releases:

```js
// app/migrations/202609071200_note.js
migration.up = (migrator) => {
  migrator.createTable({
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      body: 'TEXT',
      done: 'INTEGER',
    },
  });
};

migration.down = (migrator) => {
  migrator.dropTable();
};
```

The filename's timestamp is the order they run in. Without migrations, changing
`columns` on a model whose table already exists does nothing, and the mismatch
shows up as a missing column at runtime.

## When not to use this

A model per API response, fetched once and rendered, is more machinery than the
job needs. `Ti.Network` and a plain array is fine. Reach for models when data
outlives a screen, is shared between screens, or has to persist.

## Next

[Widgets](/docs/alloy/widgets) is how to package a piece of UI for reuse.
