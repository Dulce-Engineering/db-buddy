class Person
{
  static table = "person";

  static Init(db)
  {
    const sql = `
      create table person
      (
        id integer primary key,
        name text,
        age integer,
        dob integer,
        height real
      );
      insert into person(name, age, dob, height) values ('Roger Ramjet', 35, 1986-11-13, 1.8);
      insert into person(name, age, dob, height) values ('Noodles Romanoff', 40, 1981-01-01, 1.2);
      insert into person(name, age, dob, height) values ('Tequila Mockingbird', 30, 1991-02-02, 1.7);
    `;
    db.Exec(sql);
  }

  static async Insert(db, name, age, dob, height)
  {
    const person = {name, age, dob, height};
    await db.Insert_Row("person", person);
    return person.id;
  }

  static Get_Max_Age(db)
  {
    return db.Select_Value("select max(age) from person");
  }

  static Get_All(db)
  {
    return db.Select_Objs(Person, "select * from person");
  }
}

module.exports = Person;