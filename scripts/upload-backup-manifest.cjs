// Private backup manifest. No contents, credentials or customer data in logs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]);
const files=[];
function walk(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const full=path.join(directory,entry.name),name=path.relative(root,full).split(path.sep).join('/');
    if(entry.isDirectory())walk(full);
    else if(entry.isSymbolicLink())files.push({name,link:fs.readlinkSync(full)});
    else if(entry.isFile())files.push({name,size:fs.statSync(full).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')});
    else throw new Error('Unsupported upload entry');
  }
}
walk(root);files.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
console.log(JSON.stringify({count:files.length,files}));
