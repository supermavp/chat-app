import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { LoginComponent } from './core/auth/login/login.component';
import { DashboardComponent } from './core/chat/dashboard/dashboard.component';

import { FormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    provideFirebaseApp(() => initializeApp({ projectId: "foreshadow-chat", appId: "1:216845968202:web:a0a596fac4c847823a97b3", storageBucket: "foreshadow-chat.firebasestorage.app", apiKey: "AIzaSyCr9N6FGPDrKPvVcMmYeaKFaKssbDmVtqo", authDomain: "foreshadow-chat.firebaseapp.com", messagingSenderId: "216845968202", measurementId: "G-95WRHQTRJM" })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
