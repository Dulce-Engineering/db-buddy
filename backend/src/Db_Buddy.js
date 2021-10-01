const Utils = require('./Utils');

class Db_Buddy
{
  constructor()
  {
  }

  Connect()
  {
  }

  Get_Row_Count(dbRes)
  {
  }

  Get_Rows(dbRes)
  {
  }

  Build_Insert_SQL(tableName, paramNames, paramPlaceHolders, ignoreId)
  {
    const sql = 
      "insert into " + tableName + 
      " (" + paramNames + ") " +
      "values (" + paramPlaceHolders + ") ";

    return sql;
  }

  Build_Param_Placeholders(name)
  {
  }

  async Query(sql, params)
  {
    this.lastQuery = '';
  }

  async Run(sql, params)
  {
  }

  async Select_Values(sql, params)
  {
    let res;

    const dbRes = await this.Query(sql, params);
    if (dbRes && this.Get_Row_Count(dbRes) > 0)
    {
      res = [];
      for (const row of this.Get_Rows(dbRes))
      {
        const colNames = Object.keys(row);
        const firstColName = colNames[0];
        const firstValue = row[firstColName];
        res.push(firstValue);
      }
    }

    return res;
  }

  async Select_Value(sql, params)
  {
    let res = null;

    const dbRes = await this.Select_Values(sql, params);
    if (dbRes && dbRes.length > 0) 
    {
      res = dbRes[0];
    }
    return res;
  }

  async Select_Row(sql, params)
  {
    let res = null;

    const rows = await this.Select_Rows(sql, params);
    if (rows && rows.length > 0) 
    {
      res = rows[0];
    }

    return res;
  }

  async Select_Rows(sql, params)
  {
    let res;

    const dbRes = await this.Query(sql, params);
    if (dbRes && this.Get_Row_Count(dbRes) > 0)
    {
      res = this.Get_Rows(dbRes);
    }

    return res;
  }

  // return all rows as an array of objects of the given type
  async Select_Objs(classType, sql, params)
  {
    let res;

    const rows = await this.Select_Rows(sql, params);
    if (rows && rows.length > 0) 
    {
      res = [];
      for (const row of rows)
      {
        const newObj = new classType();
        if (classType.fields)
        {
          Db_Buddy.toDbObj(classType.fields, newObj, row);
        }
        else
        {
          Object.assign(newObj, row);
        }
        res.push(newObj);
      }
    }

    return res;
  }

  // return the first row as an object of the specified type
  async Select_Obj(classType, sql, params)
  {
    let res = null;

    const dbRes = await this.Select_Objs(classType, sql, params);
    if (dbRes && dbRes.length > 0) 
    {
      res = dbRes[0];
    }

    return res;
  }

  // insert the given object
  async Insert(tableName, fields, obj, skipUndefined, ignoreId)
  {
    let paramNames, paramPlaceHolders, counter = 1, paramVals = [], res = false;
    if (!fields)
    {
      fields = obj;
    }

    for (const fieldName in fields)
    {
      if (fieldName != "id")
      {
        const columnName = fields[fieldName]?.columnName || fieldName;
        const fieldValue = obj[fieldName];

        if (!skipUndefined || fieldValue != undefined)
        {
          paramNames = Utils.appendStr(paramNames, columnName, ", ");
          paramPlaceHolders = Utils.appendStr
            (paramPlaceHolders, this.Build_Param_Placeholders(counter), ", ");
          paramVals.push(fieldValue);
          counter++;
        }
      }
    }

    const sql = this.Build_Insert_SQL(tableName, paramNames, paramPlaceHolders, ignoreId);    
    const dbRes = await this.Run(sql, paramVals);
    if (dbRes && this.Get_Row_Count(dbRes) > 0)
    {
      if (!ignoreId)
      {
        const newId = this.Get_Rows(dbRes)[0].id;
        obj.id = newId;
      }
      res = true;
    }

    return res;
  }

  // insert the given object into the given table
  Insert_Row(tableName, obj)
  {
    return this.Insert(tableName, null, obj, false, false);
  }

  // insert the given object
  Insert_Obj(obj, skipUndefined)
  {
    return this.Insert(obj.constructor.table, obj.constructor.fields, obj, skipUndefined, obj.constructor.ignoreId);
  }

  // insert multiple objects
  async Insert_Objs(objs)
  {
    let res = true;

    for (const obj of objs)
    {
      res = res && await this.Insert_Obj(obj, true);
    }

    return res;
  }

  async Update_Obj(obj, skipUndefined, where, params)
  {
    let paramNames, counter = 1, paramVals = [], res = false;
    const tableName = obj.constructor.table;
    const fields = obj.constructor.fields;

    if (where)
    {
      paramVals = paramVals.concat(params);
      counter += params.length;
    }

    for (const fieldName in fields)
    {
      if (fieldName != "id")
      {
        const columnName = fields[fieldName].columnName;
        const fieldValue = obj[fieldName];

        if (!skipUndefined || fieldValue != undefined)
        {
          paramNames = Utils.appendStr(paramNames, columnName + " = $" + counter, ", ");
          paramVals.push(fieldValue);
          counter++;
        }
      }
    }

    if (!Utils.isEmpty(paramNames))
    {
      if (!where)
      {
        where = "id = $" + counter;
        paramVals.push(obj.id);
      }

      const sql = 
        "update " + tableName + 
        " set " + paramNames +
        " where " + where;
      
      const dbRes = await this.Query(sql, paramVals);
      if (dbRes && this.Get_Row_Count(dbRes) > 0)
      {
        res = true;
      }
    }

    return res;
  }

  async Delete(tableName, id)
  {
    let res = false;

    if (tableName && id)
    {
      const dbRes = await this.Query("delete from " + tableName + " where id = $1", [id]);
      res = dbRes && this.Get_Row_Count(dbRes) > 0;
    }

    return res;
  }

  async Delete_Obj(obj)
  {
    let res = false;

    if (obj && obj.id)
    {
      const tableName = obj.constructor.table;
      const id = obj.id;
      res = this.Delete(tableName, id);
    }

    return res;
  }

  async Delete_By_Id(classType, id)
  {
    let res = false;

    if (classType && id)
    {
      const tableName = classType.table;
      res = this.Delete(tableName, id);
    }

    return res;
  }

  // Utils ========================================================================================

  static appendUIWhere(query, where, conditions)
  {
    if (!Utils.isEmpty(where))
    {
      let whereSql;

      for (let i = 0; i < conditions.length; i += 3)
      {
        const conditionCode = conditions[i];
        let conditionSql = conditions[i+1];
        const conditionMapFn = conditions[i+2];
        if (conditionCode in where)
        {
          let conditionValue = where[conditionCode];
          if (conditionValue != undefined && conditionMapFn != "ignore_value")
          {
            if (conditionMapFn)
            {
              conditionValue = conditionMapFn(conditionValue);
            }
            query.params.push(conditionValue);
            const nextIdx = query.params.length;
            const replacer = new RegExp("\\?", 'g');
            conditionSql = conditionSql.replace(replacer, "$" + nextIdx);
          }
          whereSql = Utils.appendStr(whereSql, conditionSql, " and ");
        }
      }

      query.sql = Utils.appendStr(query.sql, whereSql, " where ");
    }

    return query;
  }
  
  static appendUIOrderBy(sql, orderBy, codes)
  {
    let orderBySql;

    if (!Utils.isEmpty(orderBy))
    {
      for (let i = 0; i < codes.length; i += 2)
      {
        if (orderBy.startsWith(codes[i]))
        {
          if (orderBy.endsWith("_ASC"))
          {
            orderBySql = codes[i+1] + " asc";
          }
          else if (orderBy.endsWith("_DSC"))
          {
            orderBySql = codes[i+1] + " desc";
          }
          else
          {
            orderBySql = codes[i+1];
          }
          break;
        }
      }
    }

    sql = Utils.appendStr(sql, orderBySql, " order by ");
    return sql;
  }

  appendParam(params, param)
  {
    let res = null;

    if (params && param)
    {
      res = [...params, param];
    }
    else if (!params && param)
    {
      res = [param];
    } 
    else if (params && !param)
    {
      res = [...params];
    }

    return res;
  }

  toColumnName(fields, fieldName)
  {
    let res = null;

    const field = fields[fieldName];
    if (field)
    {
      res = field.columnName;
    }

    return res;
  }

  toFieldName(columnName)
  {
    return Supplier.fields.find((field) => field.columnName == columnName);
  }

  toOrderType(orderType)
  {
    return orderType == "asc" ? "asc" : "desc";
  }

  toOrderBySQL(orderBy, fields)
  {
    let orderBySQL = null;

    if (orderBy)
    {
      const columnName = this.toColumnName(fields, orderBy.fieldName);
      if (columnName)
      {
        orderBySQL = columnName;

        const orderType = this.toOrderType(orderBy.type);
        if (orderType)
        {
          orderBySQL += " " + orderType;
        }
      }
    }

    return orderBySQL;
  }

  toHttpObjs(fields, objs)
  {
    let httpObjs = null;

    if (objs && objs.length > 0)
    {
      httpObjs = objs.map((obj) => this.toHttpObj(fields, obj));
    }

    return httpObjs;
  }

  toHttpObj(fields, obj)
  {
    let httpObj = {};

    for (const fieldName in fields)
    {
      const field = fields[fieldName];
      httpObj[fieldName] = obj[field.columnName];
    }

    return httpObj;
  }

  static toDbObj(fields, dbObj, httpObj)
  {
    if (httpObj)
    {
      for (const fieldName in fields)
      {
        const field = fields[fieldName];
        if (field)
        {
          dbObj[field.columnName] = httpObj[fieldName];
        }
        else
        {
          dbObj[fieldName] = httpObj[fieldName];
        }
      }
    }

    return dbObj;
  }

  static toModelObj(fields, obj, data)
  {
    if (data)
    {
      for (const fieldName in fields)
      {
        const field = fields[fieldName];
        obj[fieldName] = data[field.columnName];
      }
    }
  }
}

module.exports = Db_Buddy;