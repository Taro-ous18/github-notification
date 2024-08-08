export interface PullRequest {
	url: string;
	id: number;
	node_id: string;
	html_url: string;
	diff_url: string;
	patch_url: string;
	issue_url: string;
	commits_url: string;
	review_comments_url: string;
	review_comment_url: string;
	comments_url: string;
	statuses_url: string;
	number: number;
	state: string;
	locked: boolean;
	title: string;
	user: User;
	body: string;
	labels: Label[];
	milestone: Milestone;
	active_lock_reason: string;
	created_at: string;
	updated_at: string;
	closed_at: string;
	merged_at: string;
	merge_commit_sha: string;
	assignee: User;
	assignees: User[];
	requested_reviewers: User[];
	requested_teams: Team[];
	head: Branch;
	base: Branch;
	_links: Links;
	author_association: string;
	auto_merge: any;
	draft: boolean;
	merged: boolean;
	mergeable: boolean;
	rebaseable: boolean;
	mergeable_state: string;
	merged_by: User;
	comments: number;
	review_comments: number;
	maintainer_can_modify: boolean;
	commits: number;
	additions: number;
	deletions: number;
	changed_files: number;
}

export interface User {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: boolean;
}

export interface Label {
	id: number;
	node_id: string;
	url: string;
	name: string;
	description: string;
	color: string;
	default: boolean;
}

export interface Milestone {
	url: string;
	html_url: string;
	labels_url: string;
	id: number;
	node_id: string;
	number: number;
	state: string;
	title: string;
	description: string;
	creator: User;
	open_issues: number;
	closed_issues: number;
	created_at: string;
	updated_at: string;
	closed_at: string;
	due_on: string;
}

export interface Team {
	id: number;
	node_id: string;
	url: string;
	html_url: string;
	name: string;
	slug: string;
	description: string;
	privacy: string;
	notification_setting: string;
	permission: string;
	members_url: string;
	repositories_url: string;
}

export interface Branch {
	label: string;
	ref: string;
	sha: string;
	user: User;
	repo: Repository;
}

export interface Repository {
	id: number;
	node_id: string;
	name: string;
	full_name: string;
	owner: User;
	private: boolean;
	html_url: string;
	description: string;
	fork: boolean;
	url: string;
	archive_url: string;
	assignees_url: string;
	blobs_url: string;
	branches_url: string;
	collaborators_url: string;
	comments_url: string;
	commits_url: string;
	compare_url: string;
	contents_url: string;
	contributors_url: string;
	deployments_url: string;
	downloads_url: string;
	events_url: string;
	forks_url: string;
	git_commits_url: string;
	git_refs_url: string;
	git_tags_url: string;
	git_url: string;
	issue_comment_url: string;
	issue_events_url: string;
	issues_url: string;
	keys_url: string;
	labels_url: string;
	languages_url: string;
	merges_url: string;
	milestones_url: string;
	notifications_url: string;
	pulls_url: string;
	releases_url: string;
	ssh_url: string;
	stargazers_url: string;
	statuses_url: string;
	subscribers_url: string;
	subscription_url: string;
	tags_url: string;
	teams_url: string;
	trees_url: string;
	clone_url: string;
	mirror_url: string;
	hooks_url: string;
	svn_url: string;
	homepage: string;
	language: string | null;
	forks_count: number;
	stargazers_count: number;
	watchers_count: number;
	size: number;
	default_branch: string;
	open_issues_count: number;
	topics: string[];
	has_issues: boolean;
	has_projects: boolean;
	has_wiki: boolean;
	has_pages: boolean;
	has_downloads: boolean;
	has_discussions: boolean;
	archived: boolean;
	disabled: boolean;
	pushed_at: string;
	created_at: string;
	updated_at: string;
	permissions: Permissions;
	allow_rebase_merge: boolean;
	temp_clone_token: string;
	allow_squash_merge: boolean;
	allow_merge_commit: boolean;
	allow_forking: boolean;
	forks: number;
	open_issues: number;
	license: License;
	watchers: number;
}

export interface Permissions {
	admin: boolean;
	push: boolean;
	pull: boolean;
}

export interface License {
	key: string;
	name: string;
	url: string;
	spdx_id: string;
	node_id: string;
}

export interface Links {
	self: Link;
	html: Link;
	issue: Link;
	comments: Link;
	review_comments: Link;
	review_comment: Link;
	commits: Link;
	statuses: Link;
}

export interface Link {
	href: string;
}

export interface PullRequestComment {
	url: string;
	pull_request_review_id: number;
	id: number;
	node_id: string;
	diff_hunk: string;
	path: string;
	position: number;
	original_position: number;
	commit_id: string;
	original_commit_id: string;
	in_reply_to_id: number;
	user: {
		login: string;
		id: number;
		node_id: string;
		avatar_url: string;
		gravatar_id: string;
		url: string;
		html_url: string;
		followers_url: string;
		following_url: string;
		gists_url: string;
		starred_url: string;
		subscriptions_url: string;
		organizations_url: string;
		repos_url: string;
		events_url: string;
		received_events_url: string;
		type: string;
		site_admin: boolean;
	};
	body: string;
	created_at: string;
	updated_at: string;
	html_url: string;
	pull_request_url: string;
	author_association: string;
	_links: {
		self: {
			href: string;
		};
		html: {
			href: string;
		};
		pull_request: {
			href: string;
		};
	};
	start_line: number;
	original_start_line: number;
	start_side: string;
	line: number;
	original_line: number;
	side: string;
}
