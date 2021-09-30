const Utils = require('../utils');

class Db_Buddy
{
  constructor()
  {
    this.insertRows = this.insertRows.bind(this);
  }

  connect()
  {
  }

  async query(sql, params)
  {
    this.lastQuery = '';
  }

  async selectValue(sql, params)
  {
    let res = null;

    const dbRes = await this.selectValues(sql, params);
    if (dbRes && dbRes.length > 0) 
    {
      res = dbRes[0];
    }
    return res;
  }

  async selectValues(sql, params)
  {
    let res;

    const dbRes = await this.query(sql, params);
    if (dbRes && dbRes.rowCount > 0)
    {
      res = [];
      for (const row of dbRes.rows)
      {
        const colNames = Object.keys(row);
        const firstColName = colNames[0];
        const firstValue = row[firstColName];
        res.push(firstValue);
      }
    }

    return res;
  }

  async selectRow(sql, params)
  {
    let res = null;

    const rows = await this.selectRows(sql, params);
    if (rows && rows.length > 0) 
    {
      res = rows[0];
    }

    return res;
  }

  async selectRows(sql, params)
  {
    let res;

    const dbRes = await this.query(sql, params);
    if (dbRes && dbRes.rowCount > 0)
    {
      res = dbRes.rows;
    }

    return res;
  }

  // return the first row as an object of the specified type
  async selectObj(classType, sql, params)
  {
    let res = null;

    const dbRes = await this.selectObjs(classType, sql, params);
    if (dbRes && dbRes.length > 0) 
    {
      res = dbRes[0];
    }

    return res;
  }

  // return all rows as an array of objects of the given type
  async selectObjs(classType, sql, params)
  {
    let res;

    const rows = await this.selectRows(sql, params);
    if (rows && rows.length > 0) 
    {
      res = [];
      for (const row of rows)
      {
        const newObj = new classType(row);
        res.push(newObj);
      }
    }

    return res;
  }

  // insert the given object
  async insert(tableName, fields, obj, skipUndefined, ignoreId)
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
          paramPlaceHolders = Utils.appendStr(paramPlaceHolders, "$" + counter, ", ");
          paramVals.push(fieldValue);
          counter++;
        }
      }
    }

    let sql = 
      "insert into " + tableName + 
      " (" + paramNames + ") " +
      "values (" + paramPlaceHolders + ") ";
    if (!ignoreId)
    {
      sql += "returning id";
    }
    
    const dbRes = await this.query(sql, paramVals);
    if (dbRes && dbRes.rowCount > 0)
    {
      if (!ignoreId)
      {
        const newId = dbRes.rows[0].id;
        obj.id = newId;
      }
      res = true;
    }

    return res;
  }

  // insert the given object
  insertRow(tableName, obj)
  {
    return this.insert(tableName, null, obj, false, false);
  }

  // insert the given object
  insertObj(obj, skipUndefined)
  {
    return this.insert(obj.constructor.table, obj.constructor.fields, obj, skipUndefined, obj.constructor.ignoreId);
  }

  // insert multiple objects
  async insertObjs(objs)
  {
    let res = true;

    for (const obj of objs)
    {
      res = res && await this.insertObj(obj, true);
    }

    return res;
  }

  async updateObj(obj, skipUndefined, where, params)
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
      
      const dbRes = await this.query(sql, paramVals);
      if (dbRes && dbRes.rowCount > 0)
      {
        res = true;
      }
    }

    return res;
  }

  async deleteObj(obj)
  {
    let res = false;

    if (obj && obj.id)
    {
      const tableName = obj.constructor.table;
      const dbRes = await this.query("delete from " + tableName + " where id = $1", [obj.id]);
      res = dbRes && dbRes.rowCount > 0;
    }

    return res;
  }

  async deleteById(classType, id)
  {
    let res = false;

    if (classType && id)
    {
      const tableName = classType.table;
      const dbRes = await this.query("delete from " + tableName + " where id = $1", [id]);
      res = dbRes && dbRes.rowCount > 0;
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