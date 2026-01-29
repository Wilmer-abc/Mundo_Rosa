const bcrypt = require('bcryptjs');

bcrypt.hash('rosa123', 10).then(hash => {
  console.log(hash);
});
