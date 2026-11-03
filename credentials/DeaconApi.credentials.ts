import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DeaconApi implements ICredentialType {
	name = 'deaconApi';

	displayName = 'Deacon API';

	icon: Icon = {
		light: 'file:../nodes/Deacon/deacon.svg',
		dark: 'file:../nodes/Deacon/deacon.dark.svg',
	};

	documentationUrl = 'https://heydeacon.com/docs/api#keys';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				"In Deacon, open Integrations and press Make a key. Choose Read and write to use every action. A Read key is enough for the trigger and for reading chats. A Coding agent key won't work here.",
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://heydeacon.com',
			description: 'Leave this as https://heydeacon.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/team',
			method: 'GET',
		},
	};
}
