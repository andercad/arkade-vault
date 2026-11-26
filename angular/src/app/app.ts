import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from '@shared/components/nav/nav';

/** Shell de la app: fondo, nav, contenido de ruta y footer. */
@Component({
  imports: [RouterOutlet, NavComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
