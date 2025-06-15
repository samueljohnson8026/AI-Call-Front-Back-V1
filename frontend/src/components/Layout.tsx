import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  ChartBarIcon,
  PhoneIcon,
  CogIcon,
  MegaphoneIcon,
  XMarkIcon,
  HomeIcon,
  UserCircleIcon,
  UserGroupIcon,
  CalendarIcon,
  ShieldExclamationIcon,
  LinkIcon,
  CreditCardIcon,
  UsersIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, permission: 'dashboard' },
  { name: 'Live Calls', href: '/live-calls', icon: SignalIcon, permission: 'calls' },
  { name: 'AI Agents', href: '/agents', icon: UserGroupIcon, permission: 'agents' },
  { name: 'Call History', href: '/calls', icon: PhoneIcon, permission: 'calls' },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon, permission: 'appointments' },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, permission: 'analytics' },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon, permission: 'campaigns' },
  { name: 'Enhanced Dashboard', href: '/enhanced-dashboard', icon: HomeIcon, permission: 'dashboard' },
  { name: 'Enhanced Campaigns', href: '/enhanced-campaigns', icon: MegaphoneIcon, permission: 'campaigns' },
  { name: 'DNC List', href: '/dnc', icon: ShieldExclamationIcon, permission: 'dnc' },
  { name: 'Webhooks', href: '/webhooks', icon: LinkIcon, permission: 'webhooks' },
  { name: 'Billing', href: '/billing', icon: CreditCardIcon, permission: 'billing' },
  { name: 'Settings', href: '/settings', icon: CogIcon, permission: 'settings' },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: UsersIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const location = useLocation();
  
  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => 
    hasPermission(item.permission as any)
  );

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button
                        type="button"
                        className="-m-2.5 p-2.5"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                    <div className="flex h-16 shrink-0 items-center">
                      <h1 className="text-xl font-bold text-gray-900">AI Call Center</h1>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {filteredNavigation.map((item) => (
                              <li key={item.name}>
                                <Link
                                  to={item.href}
                                  className={classNames(
                                    location.pathname === item.href
                                      ? 'bg-gray-50 text-blue-600'
                                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                  )}
                                >
                                  <item.icon
                                    className={classNames(
                                      location.pathname === item.href
                                        ? 'text-blue-600'
                                        : 'text-gray-400 group-hover:text-blue-600',
                                      'h-6 w-6 shrink-0'
                                    )}
                                    aria-hidden="true"
                                  />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        {isAdmin && (
                          <li>
                            <div className="text-xs font-semibold leading-6 text-gray-400">Admin</div>
                            <ul role="list" className="-mx-2 mt-2 space-y-1">
                              {adminNavigation.map((item) => (
                                <li key={item.name}>
                                  <Link
                                    to={item.href}
                                    className={classNames(
                                      location.pathname === item.href
                                        ? 'bg-gray-50 text-blue-600'
                                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                    )}
                                  >
                                    <item.icon
                                      className={classNames(
                                        location.pathname === item.href
                                          ? 'text-blue-600'
                                          : 'text-gray-400 group-hover:text-blue-600',
                                        'h-6 w-6 shrink-0'
                                      )}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        )}
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
            <div className="flex h-16 shrink-0 items-center">
              <h1 className="text-xl font-bold text-gray-900">AI Call Center</h1>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {filteredNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={classNames(
                            location.pathname === item.href
                              ? 'bg-gray-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon
                            className={classNames(
                              location.pathname === item.href
                                ? 'text-blue-600'
                                : 'text-gray-400 group-hover:text-blue-600',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                {isAdmin && (
                  <li>
                    <div className="text-xs font-semibold leading-6 text-gray-400">Admin</div>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                      {adminNavigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={classNames(
                              location.pathname === item.href
                                ? 'bg-gray-50 text-blue-600'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                          >
                            <item.icon
                              className={classNames(
                                location.pathname === item.href
                                  ? 'text-blue-600'
                                  : 'text-gray-400 group-hover:text-blue-600',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
                <li className="-mx-6 mt-auto">
                  <div className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    <span className="sr-only">Your profile</span>
                    <span aria-hidden="true">{user?.email}</span>
                    <button
                      onClick={signOut}
                      className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Dashboard</div>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>

        <main className="py-10 lg:pl-72">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}