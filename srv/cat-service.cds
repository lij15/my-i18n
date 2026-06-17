using my.i18n as db from '../db/schema';

service CatalogService {

  entity Books as projection on db.Books
  actions {
    action publish() returns { message: String; };
  };
}

annotate CatalogService.Books with {
  // ─────────────────────────────────────────
  // @title: '{i18n>Key}'
  //CAP automatically finds the corresponding translation 
  //based on the Accept-Language header.
  // ─────────────────────────────────────────
  title    @title: '{i18n>BookTitle}';
  price    @title: '{i18n>Price}';
  stock    @title: '{i18n>Stock}';
  author   @title: '{i18n>Author}';
  category @title: '{i18n>Category}';
}