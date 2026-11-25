import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 *
 */
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
/** Componente raíz de la app Angular (shell provisional hasta el paso 2). */
export class App {
  protected readonly title = signal('arcade-vault-angular');
}
