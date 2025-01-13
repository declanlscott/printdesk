import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/register/_wizard/2')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/register/_wizard/2"!</div>
}
