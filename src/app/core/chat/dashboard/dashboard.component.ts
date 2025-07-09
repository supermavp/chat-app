import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AppUser, AuthService } from '../../service/auth.service';
import { filter, Observable, Subscription, tap } from 'rxjs';
import { ChatMessage, ChatService } from '../../service/chat.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  isDarkMode = false;
  isMobile = false;
  showUserList = true;
  isOnline = navigator.onLine;
  currentUser: AppUser | null = null;
  availableUsers$: Observable<AppUser[]> | undefined;
  selectedChatUser: AppUser | null = null;
  chatRoomId: string | null = null;
  messages$: Observable<ChatMessage[]> | undefined;
  newMessageText: string = '';

  private authSubscription!: Subscription;
  private chatMessagesSubscription!: Subscription;

  isLoadingUsers: boolean = true;
  isLoadingMessages: boolean = false;
  hasLoadedMessages: boolean = false; // Bandera para el scroll inicial

  constructor(
    public authService: AuthService,
    private chatService: ChatService
  ) { }

  ngOnInit(): void {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode = false;
      document.documentElement.classList.remove('dark');
    }

    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());

    this.authSubscription = this.authService.user$.pipe(
      filter(user => !!user), // Espera a que el usuario esté autenticado
      tap(user => {
        this.currentUser = user;
        this.isLoadingUsers = false;
        // Cargar usuarios disponibles para chatear
        if (this.currentUser) {
          this.availableUsers$ = this.chatService.getAvailableUsers(this.currentUser.uid);
        }
      })
    ).subscribe();
  }

  ngAfterViewChecked(): void {
    // Desplázate hacia abajo cuando los mensajes se cargan o se añaden nuevos
    if (this.messages$ && this.hasLoadedMessages) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.chatMessagesSubscription?.unsubscribe();
  }

  async selectChatUser(user: AppUser): Promise<void> {
    if (this.selectedChatUser?.uid === user.uid) {
      return; // No hacer nada si el usuario ya está seleccionado
    }

    this.selectedChatUser = user;

    if (this.isMobile) {
      this.showUserList = false;
    }

    this.isLoadingMessages = true;
    this.messages$ = undefined; // Limpiar mensajes antiguos

    if (this.chatMessagesSubscription) {
      this.chatMessagesSubscription.unsubscribe(); // Desuscribirse del chat anterior
    }

    if (this.currentUser && this.selectedChatUser) {
      try {
        this.chatRoomId = await this.chatService.getOrCreateChatRoom(this.currentUser.uid, this.selectedChatUser.uid);

        this.messages$ = this.chatService.getChatMessages(this.chatRoomId).pipe(
          tap(() => {
            this.isLoadingMessages = false;
            this.hasLoadedMessages = true; // Indicar que los mensajes se cargaron
          })
        );
        // Suscribirse para forzar el flujo de datos y el scroll
        this.chatMessagesSubscription = this.messages$.subscribe(() => {
          this.scrollToBottom(); // Asegurar scroll en cada actualización
        });

      } catch (error) {
        console.error('Error al seleccionar usuario o obtener sala de chat:', error);
        this.isLoadingMessages = false;
        // Mostrar error al usuario
      }
    }
  }

  async sendMessage(): Promise<void> {
    if (this.newMessageText.trim() === '' || !this.currentUser || !this.selectedChatUser || !this.chatRoomId) {
      return;
    }

    try {
      await this.chatService.sendMessage(
        this.chatRoomId,
        this.currentUser.uid,
        this.selectedChatUser.uid,
        this.newMessageText
      );
      this.newMessageText = ''; // Limpiar input
      // El scroll to bottom se manejará con ngAfterViewChecked y la suscripción
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Mostrar error al usuario
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  checkMobile() {
    this.isMobile = window.innerWidth < 768; // md breakpoint de Tailwind
    if (!this.isMobile) {
      this.showUserList = true; // Siempre mostrar lista en desktop
    }
  }

  volverALista() {
    this.showUserList = true;
    this.selectedChatUser = null;
  }
}
