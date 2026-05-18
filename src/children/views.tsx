import { escapeHtml } from "@kitajs/html";
import { Layout } from "../shared/layout";
import { formatPence } from "../shared/currency";
import type { ChildWithBalance } from "./commands";

interface HomePageProps {
  sessionName: string;
  children: ChildWithBalance[];
  defaultNote: string;
}

export function HomePage({ sessionName, children }: HomePageProps) {
  return (
    <Layout title="Home" sessionName={sessionName}>
      <ChildrenList children={children} />
    </Layout>
  );
}

interface AddChildPageProps {
  sessionName: string;
  error?: string;
  value?: string;
}

export function AddChildPage({ sessionName, error, value }: AddChildPageProps) {
  const safeError = error ? escapeHtml(error) : undefined;
  const safeValue = value ? escapeHtml(value) : "";

  return (
    <Layout title="Add child" sessionName={sessionName}>
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Add a child</h1>

      <form
        method="post"
        action="/children"
        data-testid="add-child-form"
        class="flex flex-col gap-3"
      >
        <input
          type="text"
          name="name"
          placeholder="Child's name"
          required
          value={safeValue}
          data-testid="add-child-input"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {safeError && (
          <p data-testid="add-child-error" class="text-sm text-red-600">
            {safeError}
          </p>
        )}
        <div class="flex gap-2">
          <button
            type="submit"
            data-testid="add-child-button"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Child
          </button>
          <a
            href="/"
            data-testid="add-child-cancel"
            class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors no-underline"
          >
            Cancel
          </a>
        </div>
      </form>
    </Layout>
  );
}

interface ChildrenListProps {
  children: ChildWithBalance[];
}

export function ChildrenList({ children }: ChildrenListProps) {
  if (children.length === 0) {
    return <EmptyState />;
  }
  return (
    <div class="flex flex-col gap-3" data-testid="children-list">
      {children.map((child) => (
        <ChildCard child={child} />
      ))}
    </div>
  );
}

export function EmptyState() {
  return (
    <p data-testid="empty-state" class="text-gray-500 text-sm py-8 text-center">
      No children yet. Open the menu to add one.
    </p>
  );
}

interface ChildCardProps {
  child: ChildWithBalance;
}

export function ChildCard({ child }: ChildCardProps) {
  const safeName = escapeHtml(child.name);
  const safeBalance = escapeHtml(formatPence(child.balance));
  const balanceColor = child.balance < 0 ? "text-red-600" : "text-green-700";

  return (
    <a
      href={`/children/${encodeURIComponent(child.name)}`}
      data-testid={`child-card-${safeName}`}
      class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all no-underline"
    >
      <span
        data-testid={`child-name-${safeName}`}
        class="text-xl font-medium text-gray-800"
      >
        {safeName}
      </span>
      <span
        data-testid={`child-balance-${safeName}`}
        class={`text-xl font-mono font-semibold ${balanceColor}`}
      >
        {safeBalance}
      </span>
    </a>
  );
}
