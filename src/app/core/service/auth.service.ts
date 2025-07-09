import { Injectable, NgZone } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from '@angular/fire/auth';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  Firestore, doc, setDoc, getDoc,
  collection, CollectionReference, DocumentData
} from '@angular/fire/firestore';

// Define la interfaz de tu usuario para consistencia
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSeen?: Date;
  isOnline?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Observables para el usuario de Firebase y el usuario de la aplicación (Firestore)
  user$: Observable<AppUser | null>;
  firebaseUser$: Observable<FirebaseUser | null>;

  private usersCollection: CollectionReference<DocumentData>;

  constructor(
    private auth: Auth,
    private afs: Firestore,
    private router: Router,
    private ngZone: NgZone // Para ejecutar el enrutamiento dentro de la zona de Angular
  ) {
    this.usersCollection = collection(this.afs, 'users');

    // Observa el estado de autenticación de Firebase
    this.firebaseUser$ = new Observable(observer => {
      this.auth.onAuthStateChanged(user => {
        observer.next(user);
        if (user) {
          // Si el usuario está logueado, actualiza su estado online
          this.updateUserOnlineStatus(user.uid, true);
        }
      });
    });

    // Combina el usuario de Firebase con el perfil de usuario de Firestore
    this.user$ = this.firebaseUser$.pipe(
      switchMap(user => {
        if (user) {
          return this.updateUserData(user); // Guarda/actualiza el perfil del usuario en Firestore
        } else {
          return of(null); // No hay usuario
        }
      })
    );
  }

  // Iniciar sesión con Google
  async googleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      // El método updateUserData se llamará a través del observable user$
      this.ngZone.run(() => {
        this.router.navigate(['/chat']);
      });
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      // Manejar errores de forma amigable para el usuario
    }
  }

  // Cerrar sesión
  async signOut() {
    try {
      if (this.auth.currentUser) {
        await this.updateUserOnlineStatus(this.auth.currentUser.uid, false);
      }
      await signOut(this.auth);
      this.ngZone.run(() => {
        this.router.navigate(['/login']);
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // Guarda/actualiza el perfil del usuario en Firestore
  private async updateUserData(user: FirebaseUser): Promise<AppUser> {
    const userRef = doc(this.usersCollection, user.uid);
    const userData: AppUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastSeen: new Date(),
      isOnline: true
    };
    try {
      await setDoc(userRef, userData, { merge: true }); // 'merge: true' fusiona los datos
      console.log('Perfil de usuario actualizado en Firestore:', user.uid);
      return userData;
    } catch (error) {
      console.error('Error al actualizar el perfil de usuario en Firestore:', error);
      throw error; // Propaga el error
    }
  }

  // Actualiza el estado online/offline del usuario
  private async updateUserOnlineStatus(uid: string, isOnline: boolean) {
    const userRef = doc(this.usersCollection, uid);
    try {
      await setDoc(userRef, { isOnline, lastSeen: new Date() }, { merge: true });
      console.log(`Estado de usuario ${uid} actualizado a ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error al actualizar estado online:', error);
    }
  }
}
