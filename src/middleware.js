import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get('access_token')?.value;
  const permissionsCookie = req.cookies.get('user_permissions')?.value;

  // Redirect if no token
  if (!token) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Parse permissions from cookie
  let permissions = {};
  try {
    if (permissionsCookie) {
      permissions = JSON.parse(permissionsCookie);
    }
  } catch {
    permissions = {};
  }

  // Define route-to-permission mapping
  const routePermissions = {
    '/dashboard/configuration/permissions': ['view_users'],
    '/dashboard/users': ['view_users'],
    '/dashboard/users/create': ['add_user'],
    '/dashboard/leads': ['view_lead'],
    '/dashboard/leads/new': ['add_lead'],
  };

  const currentPath = req.nextUrl.pathname;

  // Check if route needs permission
  for (const [route, requiredPerms] of Object.entries(routePermissions)) {
    if (currentPath.startsWith(route)) {
      const hasAllPermissions = requiredPerms.every((perm) => permissions[perm]);
      if (!hasAllPermissions) {
        url.pathname = '/unauthorized';
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'], // Apply to dashboard routes
};
