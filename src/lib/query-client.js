import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Going back to a screen shows the cached data instantly instead of refetching on every visit
			// (live screens keep their own refetchInterval).
			staleTime: 15000,
			// Never pause silently when the phone is offline: try, fail fast and let the
			// friendly "off the grid" screen and banner explain it. Stop retrying on 4xx.
			networkMode: 'always',
			retry: (count, err) => count < 1 && !(err?.status >= 400 && err?.status < 500),
		},
		mutations: { networkMode: 'always' },
	},
});
