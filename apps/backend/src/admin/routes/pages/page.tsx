import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Badge, Button, Container, Drawer, Heading, Input, Label, Select, Switch, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/client"
import { STOREFRONT_URL } from "../../lib/storefront"

/**
 * «Страницы»: служебные страницы витрины (/p/<slug>) — доставка, оплата, о компании, FAQ и т.п.
 * HTML со своими <style> внутри — как перенесли со старого сайта. Предпросмотр справа.
 */
type Page = { id: string; slug: string; title: string; page_title?: string | null; meta?: string | null; html: string; has_h1: boolean; status: "published" | "draft"; sort: number }
const EMPTY: Partial<Page> = { slug: "", title: "", page_title: "", meta: "", html: "", has_h1: false, status: "published", sort: 0 }

const PagesRoute = () => {
  const qc = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ["ohana-pages"], queryFn: () => sdk.client.fetch<{ pages: Page[] }>("/admin/ohana/pages") })
  const [edit, setEdit] = useState<Partial<Page> | null>(null)
  const save = useMutation({
    mutationFn: (p: Partial<Page>) => sdk.client.fetch<{ page: Page }>(p.id ? `/admin/ohana/pages/${p.id}` : "/admin/ohana/pages", { method: "POST", body: p }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ohana-pages"] }); toast.success("Сохранено"); setEdit(null) },
    onError: (e: any) => toast.error(e?.message || "Не удалось сохранить"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/ohana/pages/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ohana-pages"] }); toast.success("Удалено"); setEdit(null) },
  })

  return (
    <Container className="flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between p-6">
        <div>
          <Heading>Страницы сайта</Heading>
          <Text size="small" className="text-ui-fg-subtle">Служебные страницы витрины: адрес /p/&lt;slug&gt;. Черновики на сайте не показываются.</Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setEdit({ ...EMPTY })}>Создать страницу</Button>
      </div>
      {isPending && <Text className="px-6 pb-4">Загрузка…</Text>}
      <Table>
        <Table.Header>
          <Table.Row><Table.HeaderCell>Название</Table.HeaderCell><Table.HeaderCell>Адрес</Table.HeaderCell><Table.HeaderCell>Статус</Table.HeaderCell><Table.HeaderCell>Порядок</Table.HeaderCell><Table.HeaderCell></Table.HeaderCell></Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.pages || []).map((p) => (
            <Table.Row key={p.id} className="cursor-pointer" onClick={() => setEdit(p)}>
              <Table.Cell>{p.title}</Table.Cell>
              <Table.Cell><code className="text-ui-fg-subtle">/p/{p.slug}</code></Table.Cell>
              <Table.Cell><Badge size="2xsmall" color={p.status === "published" ? "green" : "grey"}>{p.status === "published" ? "Опубликована" : "Черновик"}</Badge></Table.Cell>
              <Table.Cell>{p.sort}</Table.Cell>
              <Table.Cell><a href={`${STOREFRONT_URL}/ru/p/${p.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-ui-fg-interactive text-xs">на сайте ↗</a></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <PageDrawer page={edit} onClose={() => setEdit(null)} onSave={(p) => save.mutate(p)} onDelete={(id) => confirm("Удалить страницу?") && remove.mutate(id)} saving={save.isPending} />
    </Container>
  )
}

const PageDrawer = ({ page, onClose, onSave, onDelete, saving }: { page: Partial<Page> | null; onClose: () => void; onSave: (p: Partial<Page>) => void; onDelete: (id: string) => void; saving: boolean }) => {
  const [f, setF] = useState<Partial<Page>>(EMPTY)
  const [tab, setTab] = useState<"html" | "preview">("html")
  useEffect(() => { if (page) { setF({ ...EMPTY, ...page }); setTab("html") } }, [page])
  const set = (k: keyof Page, v: any) => setF((s) => ({ ...s, [k]: v }))
  const preview = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>body{font-family:Montserrat,Arial,sans-serif;font-size:14px;color:#4A4A4A;line-height:1.6;padding:16px;max-width:900px}h1,h2,h3{color:#3A3A3A}a{color:#246075}img{max-width:100%}</style></head><body>${f.has_h1 ? "" : `<h1>${f.title || ""}</h1>`}${f.html || ""}</body></html>`
  return (
    <Drawer open={!!page} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content className="!max-w-[1100px]">
        <Drawer.Header><Drawer.Title>{f.id ? "Страница" : "Новая страница"}</Drawer.Title></Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1"><Label size="xsmall">Название (H1 и хлебные крошки)</Label><Input value={f.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Адрес (slug): латиница, цифры, дефис</Label><Input value={f.slug || ""} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="delivery" /></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Title для поисковиков</Label><Input value={f.page_title || ""} onChange={(e) => set("page_title", e.target.value)} placeholder="Доставка оптовых заказов — Ohana Market" /></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Описание для поисковиков (meta description)</Label><Input value={f.meta || ""} onChange={(e) => set("meta", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Статус</Label>
              <Select value={f.status || "published"} onValueChange={(v) => set("status", v)}><Select.Trigger><Select.Value /></Select.Trigger><Select.Content><Select.Item value="published">Опубликована</Select.Item><Select.Item value="draft">Черновик</Select.Item></Select.Content></Select></div>
            <div className="flex items-end gap-6">
              <div className="flex flex-col gap-1"><Label size="xsmall">Порядок</Label><Input type="number" value={f.sort ?? 0} onChange={(e) => set("sort", Number(e.target.value))} className="w-24" /></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={!!f.has_h1} onCheckedChange={(v) => set("has_h1", v)} /><Label size="xsmall">Заголовок уже есть в HTML</Label></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="small" variant={tab === "html" ? "primary" : "secondary"} onClick={() => setTab("html")}>HTML</Button>
            <Button size="small" variant={tab === "preview" ? "primary" : "secondary"} onClick={() => setTab("preview")}>Предпросмотр</Button>
            <Text size="xsmall" className="text-ui-fg-subtle">Стили можно держать прямо в HTML (&lt;style&gt;…&lt;/style&gt;), как на перенесённых страницах. Картинки — по ссылкам на api.ohanaopt.ru/images/…</Text>
          </div>
          {tab === "html" ? (
            <Textarea value={f.html || ""} onChange={(e) => set("html", e.target.value)} rows={26} className="font-mono text-xs" spellCheck={false} />
          ) : (
            <iframe title="Предпросмотр" srcDoc={preview} className="h-[560px] w-full rounded-md border bg-white" />
          )}
        </Drawer.Body>
        <Drawer.Footer className="flex justify-between">
          <div>{f.id && <Button variant="danger" size="small" onClick={() => onDelete(f.id!)}>Удалить</Button>}</div>
          <div className="flex gap-2"><Button variant="secondary" size="small" onClick={onClose}>Отмена</Button><Button size="small" isLoading={saving} onClick={() => onSave(f)}>Сохранить</Button></div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

export const config = defineRouteConfig({ label: "Страницы", icon: DocumentText })
export default PagesRoute
