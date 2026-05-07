import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalFooterComponent } from "./app-global-footer/app-global-footer.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

}
