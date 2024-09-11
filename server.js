const express = require('express');
const path = require('path');

const app = express();
const port = 8000;


// Serve static files from the "src" directory
app.use(express.static(path.join(__dirname, 'src')));

app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});
