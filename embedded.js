require('depject')(
  require('./modules_embedded'),
  require('./modules_basic'),
  require('./modules_extra')
).plugs.app[0]()




