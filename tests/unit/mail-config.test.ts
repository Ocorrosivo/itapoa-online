import { test } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { mailConfig, mailService } from '../../src/server/services/mailService.js';
import { recoveryMailConfig } from '../../src/server/services/recoveryMailService.js';

test('registration and recovery share explicit SMTP settings and supported aliases', () => {
  const names=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_USERNAME','SMTP_PASSWORD','SMTP_PASS','SMTP_FROM','EMAIL_FROM'];
  const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try {
    for(const name of names) delete process.env[name];
    process.env.SMTP_PASS='synthetic-password';
    assert.equal(mailConfig(),null,'never guess a provider or sender from a password alone');
    assert.equal(recoveryMailConfig(),null);
    Object.assign(process.env,{SMTP_HOST:'smtp.example.test',SMTP_PORT:'587',SMTP_USERNAME:'sender@example.test',EMAIL_FROM:'sender@example.test'});
    assert.deepEqual(recoveryMailConfig(),mailConfig());
    assert.equal(mailConfig()?.user,'sender@example.test');
    assert.equal(mailConfig()?.port,587);
    process.env.SMTP_FROM='sender@example.test\r\nBcc: other@example.test';
    assert.equal(mailConfig(),null);
    assert.equal(recoveryMailConfig(),null);
  }finally{
    for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];
  }
});

test('general email API never receives raw SMTP errors and always closes transport', async()=>{
  const names=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM'];
  const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  const original=nodemailer.createTransport;let closed=false;
  Object.assign(process.env,{SMTP_HOST:'smtp.example.test',SMTP_PORT:'465',SMTP_USER:'sender@example.test',SMTP_PASSWORD:'synthetic-password',SMTP_FROM:'sender@example.test'});
  (nodemailer as any).createTransport=()=>({async sendMail(){throw new Error('private SMTP credentials and recipient');},close(){closed=true;}});
  try{
    await assert.rejects(mailService.send({to:'recipient@example.test',subject:'fixture',text:'synthetic'}),{message:'SMTP_DELIVERY_FAILED'});
    assert.equal(closed,true);
  }finally{
    nodemailer.createTransport=original;
    for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];
  }
});
