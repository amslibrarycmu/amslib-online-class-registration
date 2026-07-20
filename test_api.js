const http = require('http');

http.get('http://localhost:5000/api/requests/admin?status=all', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    if(res.statusCode !== 200) {
       console.log("Headers:", res.headers);
    } else {
       console.log(data.substring(0, 2000));
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
