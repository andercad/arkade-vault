import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Shell de la app: fondo, cabecera mínima (logo), contenido de ruta y footer. */
@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
