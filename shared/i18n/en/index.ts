// Gộp các namespace (tiền tố trước dấu chấm đầu tiên của khóa) thành một bảng phẳng.
import app from './app';
import nav from './nav';
import topbar from './topbar';
import sidebar from './sidebar';
import auth from './auth';
import locale from './locale';
import home from './home';
import common from './common';
import category from './category';
import spending from './spending';
import ledger from './ledger';
import earn from './earn';
import error from './error';
import overview from './overview';
import safety from './safety';
import calendar from './calendar';
import choices from './choices';
import workspace from './workspace';
import audit from './audit';
import portfolio from './portfolio';
import onboarding from './onboarding';
import simulation from './simulation';

export const namespaces = { app, nav, topbar, sidebar, auth, locale, home, common, category, spending, ledger, earn, error, overview, safety, calendar, choices, workspace, audit, portfolio, onboarding, simulation } as const;

const messages: Record<string, string> = Object.assign({}, ...Object.values(namespaces));

export default messages;
