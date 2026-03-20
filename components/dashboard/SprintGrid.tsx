'use client'

interface SprintGridProps {
  sprints: Array<{
    id: string
    title: string
    description?: string
    status: string
    created_at: string
  }>
  onSprintDeleted: () => void
}

export default function SprintGrid({ sprints }: SprintGridProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sprints.map((sprint) => (
        <a
          key={sprint.id}
          href={`/dashboard/${sprint.id}`}
          className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                {sprint.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(sprint.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(sprint.status)}`}>
              {sprint.status}
            </span>
          </div>
          {sprint.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{sprint.description}</p>
          )}
        </a>
      ))}
    </div>
  )
}
