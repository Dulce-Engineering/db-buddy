# db-buddy
Yet another database abstraction class. This one is designed to make my life easier when working with SQL.
Following are some of the convenience functions available:
```
const ages = await db.Select_Values("select age from person");
// ages = [35, 40, 30]

const name = await Select_Value("select name where id=?", [2]);
// name = "Noodles Romanoff"

const row = await db.Select_Row("select * from person where age=?", [40]);
// row = {id: 2, name: "Noodles Romanoff", age: 40, dob: "1981-01-01", height: 1.2}

const rows = await db.Select_Rows("select * from person where age>?", [30]);
// rows = 
//  [{id: 1, name: "Roger Ramjet", age: 35, dob: "1986-11-13", height: 1.8},
//  {id: 2, name: "Noodles Romanoff", age: 40, dob: "1981-01-01", height: 1.2}]
```