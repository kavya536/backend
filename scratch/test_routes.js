const router = require('../src/routes');
console.log('Routes in router:');
router.stack.forEach(layer => {
  if (layer.route) {
    console.log(layer.route.methods, layer.route.path);
  }
});
