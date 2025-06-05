import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import DetailPage from '../pages/detail/detail-page';
import AddPage from '../pages/add/add-pages';
import LoginPage from '../pages/login/login-page';
import RegisterPage from '../pages/register/register-page';
import FavoritesPage from '../pages/favorites/favorites-page';
import SettingsPage from '../pages/settings/settings-page';
import SavedDataPage from '../pages/saved-data-page';

const routes = {
  '/': new HomePage(),
  '/about': new AboutPage(),
  '/detail/:id': new DetailPage(),
  '/add': new AddPage(),
  '/login': new LoginPage(),
  '/register': new RegisterPage(),
  '/favorites': new FavoritesPage(),
  '/settings': new SettingsPage(),
  '/saved': SavedDataPage,
};

export default routes;
