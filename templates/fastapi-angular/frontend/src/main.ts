import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({selector:'app-root', standalone:true, imports:[CommonModule, FormsModule], template:`
<h1>RagLift Chat</h1><section><input [(ngModel)]="question" placeholder="Ask a question"><button (click)="ask()">Ask</button><p>{{answer}}</p><h3>Sources</h3><ul><li *ngFor="let s of sources">{{s.path}}#{{s.chunk_id}} — {{s.content_preview}}</li></ul></section>
<section><h2>Upload Documents</h2><input type="file" (change)="upload($event)"><button (click)="ingest()">Ingest</button></section><section><h2>Settings</h2><p>Backend: {{api}}</p></section>`})
class App { api='http://localhost:8000'; question=''; answer=''; sources:any[]=[]; constructor(private http:HttpClient){} ask(){this.http.post<any>(`${this.api}/api/chat`,{question:this.question}).subscribe(r=>{this.answer=r.answer;this.sources=r.sources})} upload(e:any){const f=e.target.files[0]; const data=new FormData(); data.append('file',f); this.http.post(`${this.api}/api/documents/upload`,data).subscribe()} ingest(){this.http.post(`${this.api}/api/documents/ingest`,{}).subscribe()} }
bootstrapApplication(App, {providers:[provideHttpClient()]});
