import materialColors from 'material-colors'
import ColorsConstant from './ColorsConstant.js'

import './Colors.scss'
;(function(global) {
  global.Colors = new ColorsHandler()

  function ColorsHandler() {
    this.byName = byName

    ////////////////

    function byName(name) {
      var color = ColorsConstant[name]
      if (!color && typeof materialColors !== 'undefined') {
        var c = name.split('-') // red-500, blue-a100, deepPurple-500, etc
        if (c.length) color = (materialColors[c[0]] || {})[c[1]]
      }
      return color || '#fff'
    }
  }
})(window)
