namespace my.i18n;
using { cuid, managed } from '@sap/cds/common';

entity Books : cuid, managed {
  title    : String(200);
  price    : Decimal(9, 2);
  stock    : Integer default 0;
  author   : String(100);
  category : String(20);
}