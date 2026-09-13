import { createRouter, createWebHistory } from 'vue-router'
import AccueilView from '../views/AccueilView.vue'
import ResultatsView from '../views/ResultatsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'accueil',
      component: AccueilView
    },
    {
      path: '/resultats',
      name: 'resultats',
      component: ResultatsView
    },
    {
      path: '/cote',
      name: 'cote',
      component: () => import('../views/CoteView.vue')
    }
  ],
})

export default router