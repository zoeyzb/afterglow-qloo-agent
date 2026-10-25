'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const handler=require('./api/discover');const root=path.join(__dirname,'public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const app=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/discover'){
  let body='';for await(const part of req){body+=part;if(body.length>12000){res.writeHead(413);res.end('Request too large');return}}
  req.body=body;return handler(req,res)
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return}
 const file=pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
 const dest=path.resolve(root,file);
 if(!dest.startsWith(root+path.sep)&&dest!==path.join(root,'index.html')){res.writeHead(403);res.end('Forbidden');return}
 const ext=path.extname(dest);if(!mime[ext]){res.writeHead(404);res.end('Not found');return}
 fs.stat(dest,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return}res.setHeader('Content-Type',mime[ext]);if(req.method==='HEAD'){res.end();return}fs.createReadStream(dest).pipe(res)})
});const port=Number(process.env.PORT)||3000;app.listen(port,()=>console.log('Afterglow listening on http://localhost:'+port));