/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Error {}
    interface Locals {
      clientIP: string;
      requestId: string;
    }
    interface PageData {}
    interface PageState {}
    interface Platform {}
  }
}

export {};
