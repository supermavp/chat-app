import { Injectable } from '@angular/core';
import {
  Firestore, collection, query, orderBy, limit,
  doc, setDoc, getDoc, updateDoc, where,
  CollectionReference, DocumentData
} from '@angular/fire/firestore';
import { collectionData, docData } from 'rxfire/firestore';
import { Observable, from, forkJoin } from 'rxjs';
import { map, switchMap, filter } from 'rxjs/operators';
import { AppUser } from './auth.service'; // Reutiliza la interfaz AppUser

export interface ChatMessage {
  senderId: string;
  receiverId: string; // Para referencia fácil
  text: string;
  timestamp: any; // Firebase Timestamp
}

export interface ChatRoom {
  id: string;
  users: string[]; // UID de los participantes
  createdAt: any; // Firebase Timestamp
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private usersCollection: CollectionReference<DocumentData>;
  private chatsCollection: CollectionReference<DocumentData>;

  constructor(private afs: Firestore) {
    this.usersCollection = collection(this.afs, 'users');
    this.chatsCollection = collection(this.afs, 'chats');
  }

  // Obtiene todos los usuarios disponibles (excepto el actual)
  getAvailableUsers(currentUserId: string): Observable<AppUser[]> {
    const q = query(this.usersCollection, where('uid', '!=', currentUserId), orderBy('displayName'));
    return collectionData(q, { idField: 'uid' }) as Observable<AppUser[]>;
  }

  // Obtiene los datos de un usuario específico por su UID
  getUserById(uid: string): Observable<AppUser> {
    return docData(doc(this.usersCollection, uid), { idField: 'uid' }) as Observable<AppUser>;
  }

  // Obtiene los mensajes de una sala de chat específica
  getChatMessages(chatRoomId: string): Observable<ChatMessage[]> {
    if (!chatRoomId) {
      return new Observable<ChatMessage[]>(); // Retorna un observable vacío si no hay chatRoomId
    }
    const messagesRef = collection(doc(this.chatsCollection, chatRoomId), 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc')); // Ordena por timestamp
    return collectionData(q) as Observable<ChatMessage[]>;
  }

  // Crea o recupera una sala de chat entre dos usuarios
  async getOrCreateChatRoom(user1Id: string, user2Id: string): Promise<string> {
    // Genera un ID de chatroom consistente (UID menor_UID mayor)
    const chatRoomId = [user1Id, user2Id].sort().join('_');
    const chatRoomRef = doc(this.chatsCollection, chatRoomId);

    try {
      const docSnap = await getDoc(chatRoomRef);

      if (!docSnap.exists()) {
        // Crea la sala si no existe
        await setDoc(chatRoomRef, {
          users: [user1Id, user2Id],
          createdAt: new Date(),
        });
        console.log('Sala de chat creada:', chatRoomId);
      } else {
        console.log('Sala de chat existente:', chatRoomId);
      }
      return chatRoomId;
    } catch (error) {
      console.error('Error al obtener/crear sala de chat:', error);
      throw error;
    }
  }

  // Envía un mensaje a una sala de chat específica
  async sendMessage(chatRoomId: string, senderId: string, receiverId: string, text: string) {
    if (!chatRoomId || !text.trim()) {
      console.warn('No se puede enviar mensaje: chatRoomId o texto vacío.');
      return;
    }

    const messagesRef = collection(doc(this.chatsCollection, chatRoomId), 'messages');
    try {
      await setDoc(doc(messagesRef), {
        senderId,
        receiverId,
        text,
        timestamp: new Date(), // Usa la fecha actual como timestamp
      });
      console.log('Mensaje enviado a:', chatRoomId);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }

  // Actualiza el estado 'isOnline' de un usuario (para uso en el servicio de autenticación)
  async updateUserOnlineStatus(uid: string, isOnline: boolean) {
    const userRef = doc(this.usersCollection, uid);
    try {
      await updateDoc(userRef, { isOnline, lastSeen: new Date() });
    } catch (error) {
      console.error('Error al actualizar estado online:', error);
    }
  }
}
