

class H
  @Merge:(ToReturn)->
    ToReturn = ToReturn || {}
    Array.prototype.slice.call(arguments,1).forEach (Argument)->
      for Key,Value of Argument
        if Value isnt null and typeof Value is 'object'
          if Value.constructor.name is 'Array'
            ToReturn[Key] = ToReturn[Key] || [];
            ToReturn[Key].concat(Value)
          else
            ToReturn[Key] = ToReturn[Key] || {};
            H.Merge(ToReturn[Key], Value);
        else
          ToReturn[Key] = Value
    return ToReturn
module.exports = H