const fetch = require('node-fetch');
const parser = require('xml2json');

class Utils
{
  static replaceSQLString(params, sql)
  {
    let replacer;
    for (const [key, value] of Object.entries(params))
    {
      replacer = new RegExp('{'+key+'}', 'g');
      sql = sql.replace(replacer, value);
    }
    return sql;
  }
  
  /**
   * 
   * @param {string} a - Original String
   * @param {string} b - Appending String 
   * @param {string} sep - Separator 
   * @returns {string}
   */
  static appendStr(a, b, sep)
  {
    let res = null;

    if (sep == null || sep == undefined)
    {
      sep = "";
    }
    if (a && b && a.length > 0 && b.length > 0)
    {
      res = a + sep + b;
    } else if (a && !b && a.length > 0)
    {
      res = a;
    } else if (!a && b && b.length > 0)
    {
      res = b;
    }

    return res;
  }

  static equal(x, y)
  {
    let res = false;

    if (Array.isArray(x) && Array.isArray(y))
    {
      const equalValues = (a) => (b) => a === b;
      const compareArrays =
        (e) =>
          ([a, ...az]) =>
            ([b, ...bz]) =>
              a === undefined && b === undefined
                ? true
                : Boolean(e(a)(b)) && compareArrays(e)(az)(bz);

      const compare = compareArrays(equalValues);

      res = compare(x)(y);
    }

    return res;
  }

  static nullIfEmpty(items)
  {
    let res = items;

    if (Utils.isEmpty(items))
    {
      res = null;
    }

    return res;
  }

  static isEmpty(items)
  {
    let res = false;
    const typeOfItems = typeof items;

    if (items == null || items == undefined)
    {
      res = true;
    }
    else if (Array.isArray(items))
    {
      if (items.length == 0)
      {
        res = true;
      }
    }
    else if (typeOfItems == "string")
    {
      const str = items.trim();
      if (str.length == 0 || str == "")
      {
        res = true;
      }
    }
    else if (typeOfItems == "object")
    {
      res = Utils.isEmptyObj(items);
    }

    return res;
  }

  /**
   * strips out all spaces, special characters, tags, tabs and newlines before checking value
   * @param {string} str 
   */
  static isEmptyHtmlValue(str)
  {
    if(str === null || str === undefined) return true;
    if(typeof str !== 'string') return false;
    
    return str.replace(/&([^&]+);|<([^>]+)>|[\n\r\t\s]/gi, '') === '';
  }

  /**
  * 
  * @param {string} text 
  * @returns {string} text with all words capitalized
  */
  static capitalizeAllWords(text)
  {
    return text.split(',')
      .map(word => word.trim())
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(', ');
  }

  /**
   * A function that validates the number of parameters against aprrox. fixed number and 
   * split the provided array in the @arr param if number of params exceed the fixed number.   
   * @param {Array} arr - Array to check for overflowing params 
   * @returns {Array} an array of small arrays
   */
  static limitInsertParamsPostgres(arr)
  {
    if(arr.length > 0 && arr.length * Object.keys(arr[0]).length > 60000)
    {
      let tempLength = arr.length;
      let size = 0;

      while(tempLength * Object.keys(arr[0]).length > 60000)
      {
        tempLength--;
        size = tempLength;
      }

      // Split the original array into chunks according to size defined for each chunk.
      return Utils.chunkArrayInGroups(arr, size);
    }
    return [];
  }

  /**
   * Chunks big arrays into number of small arrays depending on the @size parameter
   * @param {Array} arr - An array that needs to be divided into smaller pieces 
   * @param {Number} size - An integer value that acts as divisor  
   * @returns {Array} - Chunks of a big array
   */
  static chunkArrayInGroups(arr, size) {
    let arrayHolder = [];
    for(let i = 0; i < arr.length; i += size) {
      arrayHolder.push(arr.slice(i, i+size));
    }
    return arrayHolder;
  }

  static hasValue(value)
  {
    return value != null && value != undefined;
  }

  /**
   * @param {Iterable} list 
   * @param {(item)=>prop} key 
   * @return {{key:any,val:items[]}[]}
   */
  static group(list, key) {
    const groups = [];
    return Array.from(list).reduce((groups, item) => {
      const k = key(item);
      const idx = groups.findIndex(g => g.key == k);
      const group = idx > -1 ? groups[idx] : { key: k, val: [] };
      group.val.push(item);
      if (idx == -1) groups.push(group);
      return groups;
    }, groups);
  }

  static consoleLog()
  {
    const outStrs = [];
    for (const argument of arguments)
    {
      const argType = typeof argument;
      if (argType == "object")
      {
        const jsonStr = JSON.stringify(argument);
        outStrs.push(jsonStr);
      }
      else
      {
        outStrs.push(argument);
      }
    }

    if (!Utils.isEmpty(outStrs))
    {
      console.log(...outStrs);
    }
  }

  static ensureString(value)
  {
    return typeof value === 'string' ? value : null;
  }

  static formatLatLong(value)
  {
    return value ? Number(value.match(/.+?\.\d{1,6}/)[0]) : null;
  }

  static isEmptyObj(obj)
  {
    if (!obj) return true;

    return Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  static length(value)
  {
    let res = 0;

    if (value)
    {
      res = value.length;
    }

    return res;
  }

  // Casting ======================================================================================

  static toAlwaysArray(array)
  {
    let res = array;
    if (array == null || array == undefined)
    {
      res = [];
    }

    return res;
  }

  static toArray(str)
  {
    let res = null;

    if (str)
    {
      const strObj = JSON.parse(str);
      if (strObj && Array.isArray(strObj) && strObj.length > 0)
      {
        res = strObj;
      }
    }

    return res;
  }

  static toNull(value)
  {
    let res = value;

    if (value == undefined)
    {
      res = null;
    }

    return res;
  }

  static toInt(value, defaultValue)
  {
    let res = value;

    if (Utils.isEmpty(value))
    {
      res = defaultValue;
    }
    else
    {
      res = parseInt(value);
    }

    return res;
  }

  static toFloat(value, defaultValue)
  {
    let res = value;

    if (Utils.isEmpty(value))
    {
      res = defaultValue;
    }
    else
    {
      res = parseFloat(value);
    }

    return res;
  }

  static toCents(price)
  {
    let newPrice = 0;

    if (price)
    {
      newPrice = price * 100;
    }

    return newPrice;
  }

  static toDollarsCents(price)
  {
    let newPrice = 0;

    if (price)
    {
      newPrice = price / 100;
    }

    return newPrice;
  }

  static toBoolean(val)
  {
    let res = false;

    if (val != null && val != undefined)
    {
      const valType = typeof val;
      if (valType == "string")
      {
        val = val.toLowerCase();
        if (val == "true" || val == "yes" || val == "t")
        {
          res = true;
        }
      }
      else if (valType == "number")
      {
        if (val != 0)
        {
          res = true;
        }
      }
      else
      {
        res = (val);
      }
    }

    return res;
  }
 
  static toValueArray(str)
  {
    let res = null;
    const strArray = Utils.toArray(str);

    if (strArray)
    {
      res = strArray.map(item => item.value);
    }

    return res;
  }

  static toJSONStr(obj)
  {
    let res;

    if (obj)
    {
      res = JSON.stringify(obj);
    }

    return res;
  }

  static xmlToJson(xmlStr)
  {
    let jsonStr, res;

    try 
    {
      jsonStr = parser.toJson(xmlStr);
    }
    catch(e)
    {
      jsonStr = null;
      console.error("Utils.xmlToJson():", e);
    }

    if (jsonStr)
    {
      res = JSON.parse(jsonStr);
    }

    return res;
  }

  static to2DigitStr(number)
  {
    let res;

    if (number < 10)
    {
      res = "0" + number;
    }
    else
    {
      res = "" + number;
    }

    return res;
  }

  // HTTP =========================================================================================
  
  static appendParam(params, paramName, paramValue, defValue)
  {
    if (!Utils.isEmpty(paramValue))
    {
      params = Utils.appendStr(params, paramName + "=" + paramValue, "&");
    }
    else if (!Utils.isEmpty(defValue))
    {
      params = Utils.appendStr(params, paramName + "=" + defValue, "&");
    }

    return params;
  }

  static fetchPostJson(url, xApiKey, bodyObj, auth)
  {
    let body;

    if (bodyObj)
    {
      body = JSON.stringify(bodyObj);
    }

    return Utils.fetchJson(url, "POST", xApiKey, body, auth);
  }
  
  static fetchGetJson(url, xApiKey)
  {
    return Utils.fetchJson(url, "GET", xApiKey);
  }
  
  static async fetchJson(url, method, xApiKey, body, auth)
  {
    let res = null;
    const options = Utils.setOptions(method, xApiKey, 'application/json', body, auth);
    
    const httpRes = await fetch(url, options);
    if (httpRes)
    {
      const textRes = await httpRes.text();
      res = JSON.parse(textRes);
    }

    return res;
  }
  
  static async fetchGetXml(url)
  {
    let res = null;
    const options = Utils.setOptions("GET", null, 'application/soap+xml');
    
    const httpRes = await fetch(url, options);
    if (httpRes)
    {
      const textRes = await httpRes.text();
      if (httpRes.ok)
      {
        res = Utils.xmlToJson(textRes);
      }
      else
      {
        console.error("Utils.fetchGetXml(): HTTP status, data -", httpRes.status, textRes);
      }
    }

    return res;
  }

  static async fetch(url, method, xApiKey, body)
  {
    let res = null;
    const options =
    {
      method,
      headers: 
      {
        'Content-Type': 'application/json',
        'x-api-key': xApiKey
      }
    };

    if (body)
    {
      options.body = body;
    }
    
    const httpRes = await fetch(url, options);
    if (httpRes)
    {
      res = await httpRes.text();
    }

    return res;
  }
  
  static setOptions(method, xApiKey, contentType, body, auth)
  {
    const options =
    {
      method,
      headers: 
      {
        'Content-Type': contentType,
        'x-api-key': xApiKey
      }
    };

    if (body)
    {
      options.body = body;
    }
    if (auth)
    {
      options.headers.Authorization = auth;
    }

    return options;
  }

  static setBooleanHttpStatus(config, ctx, res, error)
  {
    if (error)
    {
      ctx.status = 500;
      if (config.SEND_ERROR)
      {
        ctx.body = error;
      }
      else
      {
        ctx.body = null;
      }
    }
    else
    {
      if (res)
      {
        ctx.status = 200;
        ctx.body = res;
      }
      else
      {
        ctx.status = 404;
        ctx.body = null;
      }
    }
  }

  static setError(e)
  {
    if (e.composeResponse) 
    {
      e.composeResponse();
    }
    else
    {
      e = {message: "There was an error."};
    }

    return e;
  }

  // Dates ========================================================================================

  static getCurrentDate()
  {
    const now = new Date();
    const res = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return res;
  }

  static addDays(date, days)
  {
    const res = new Date(date);
    res.setDate(res.getDate() + days);

    return res;
  }

  static addMonths(date, months)
  {
    const res = new Date(date);
    res.setMonth(res.getMonth() + months);

    return res;
  }

  static toDateStr(date)
  {
    let dateStr;

    if (date)
    {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      dateStr = year + "-" + Utils.to2DigitStr(month) + "-" + Utils.to2DigitStr(day);
    }

    return dateStr;
  }

  static getDayOfWeekName(date)
  {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const day = date.getDay();
    const dayOfWeek = dayNames[day];

    return dayOfWeek;
  }

  static toDateOnly(dateStr)
  {
    const values = dateStr.split("-");
    const year = parseInt(values[0]);
    const month = parseInt(values[1]) - 1;
    const day = parseInt(values[2]);
    const date = new Date(year, month, day);

    return date;
  }

  /**
   * 
   * @param {string|Date} start 
   * @param {string|Date} end 
   * @param {string[]} exclude
   * @param {boolean} timeStamp - Date with time stamps
   * @param {boolean} fromToday - Start from Today 
   * @returns {any[string]}
   */
  static getDates(start, end, exclude=[], timeStamp=true, fromToday=false)
  {
  	start = new Date(start);
    end = new Date(end);
    const dates = [];
    
    const today = new Date((new Date()).toISOString().split('T')[0]);

    if(fromToday === true && start < today)
    {
      start = today; 
    }

    if(end > start)
    {

      if(timeStamp)
      {
        dates.push(start.toISOString());
      }
      else 
      {
        dates.push(start.toISOString().split('T')[0]);
      }
  
      const days = Math.round((end-start)/(1000*60*60*24)) + 1;
      
      for(let i = 1; i < days; i++)
      {
  
        let d = (this.addDays(start, i)).toISOString();
        
        if(!timeStamp)
        {
          d = d.split('T')[0];
        }
  
        if(exclude && Array.isArray(exclude) && !exclude.includes(d))
        {
          dates.push(d);	
        }
        else 
        {
          dates.push(d);	
        }
      }
    }
    else if(end.toISOString() === start.toISOString())
    {
      dates.push(start.toISOString().split('T')[0]);
    }

    
    return dates;
  }

  static sleep(ms)
  {
    return new Promise((resolve) =>
    {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Returns an iso string without milliseconds 
   * @param { String } d - ISO String
   * @return { String } 
   */
  static toISOStringWithoutSeconds(d=new Date().toISOString())
  {
    const split = d.split('.');
    d = `${split[0]}${split[1].slice(-1)}`;
    return d;
  }

  static toDaysDiff(fromDateStr, toDateStr)
  {
    let days;

    if (fromDateStr && toDateStr)
    {
      const fromDate = Utils.toDateOnly(fromDateStr);
      const toDate = Utils.toDateOnly(toDateStr);
      const diffMillis = toDate - fromDate;
      days = diffMillis/1000/60/60/24;
    }

    return days;
  }

  static toUniqueArray(arr=[])
  {
    return arr.filter((value, index, self) => self.indexOf(value) === index);
  }


  static toHours(minutes)
  {
    let res = '';
    if(minutes > 0)
    {
       const h = Math.floor(minutes / 60);
       const m = minutes % 60;
      if(h == 1) res += h + ' hour';
      if(h > 1)  res += h + ' hours';
      if(m == 1) res += ` ${m} minute`;
      if(m > 1)  res += ` ${m} minutes`;
    }

    return res.trim();
  }
}

module.exports = Utils;