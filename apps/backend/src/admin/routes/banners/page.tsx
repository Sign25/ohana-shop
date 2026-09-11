import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo } from "@medusajs/icons"
import { Badge, Button, Container, Drawer, Heading, Input, Label, Select, Switch, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { sdk } from "../../lib/client"

/**
 * «Баннеры»: карусель главной (место hero) и другие места витрины. Картинка загружается сюда же
 * (файловый модуль Medusa), ссылка — внутренний адрес сайта (/categories/…, /products/…, /p/…).
 */
type Banner = { id: string; place: string; title: string; image_url: string; mobile_image_url?: string | null; link?: string | null; alt?: string | null; sort: number; active: boolean; starts_at?: string | null; ends_at?: string | null }
const EMPTY: Partial<Banner> = { place: "hero", title: "", image_url: "", mobile_image_url: "", link: "", alt: "", sort: 0, active: true, starts_at: "", ends_at: "" }
const PLACES: Record<string, string> = { hero: "Главная — карусель сверху" }

const BannersRoute = () => {
  const qc = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ["ohana-banners"], queryFn: () => sdk.client.fetch<{ banners: Banner[] }>("/admin/ohana/banners") })
  const [edit, setEdit] = useState<Partial<Banner> | null>(null)
  const save = useMutation({
    mutationFn: (b: Partial<Banner>) => sdk.client.fetch<{ banner: Banner }>(b.id ? `/admin/ohana/banners/${b.id}` : "/admin/ohana/banners", { method: "POST", body: b }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ohana-banners"] }); toast.success("Сохранено"); setEdit(null) },
    onError: (e: any) => toast.error(e?.message || "Не удалось сохранить"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/ohana/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ohana-banners"] }); toast.success("Удалено"); setEdit(null) },
  })
  const toggle = (b: Banner) => save.mutate({ id: b.id, active: !b.active })

  return (
    <Container className="flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between p-6">
        <div>
          <Heading>Баннеры</Heading>
          <Text size="small" className="text-ui-fg-subtle">Карусель на главной: показываются включённые баннеры по порядку, первый — самый важный. Размер картинки для hero — 1920×560 (или пропорционально), до 1 МБ.</Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setEdit({ ...EMPTY })}>Добавить баннер</Button>
      </div>
      {isPending && <Text className="px-6 pb-4">Загрузка…</Text>}
      <Table>
        <Table.Header><Table.Row><Table.HeaderCell></Table.HeaderCell><Table.HeaderCell>Название</Table.HeaderCell><Table.HeaderCell>Место</Table.HeaderCell><Table.HeaderCell>Ссылка</Table.HeaderCell><Table.HeaderCell>Порядок</Table.HeaderCell><Table.HeaderCell>Показ</Table.HeaderCell></Table.Row></Table.Header>
        <Table.Body>
          {(data?.banners || []).map((b) => (
            <Table.Row key={b.id} className="cursor-pointer" onClick={() => setEdit(b)}>
              <Table.Cell><img src={b.image_url} alt="" className="h-12 w-32 rounded object-cover" /></Table.Cell>
              <Table.Cell>{b.title}</Table.Cell>
              <Table.Cell>{PLACES[b.place] || b.place}</Table.Cell>
              <Table.Cell><code className="text-ui-fg-subtle text-xs">{b.link}</code></Table.Cell>
              <Table.Cell>{b.sort}</Table.Cell>
              <Table.Cell onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-2"><Switch checked={b.active} onCheckedChange={() => toggle(b)} /><Badge size="2xsmall" color={b.active ? "green" : "grey"}>{b.active ? "Вкл" : "Выкл"}</Badge></div></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <BannerDrawer banner={edit} onClose={() => setEdit(null)} onSave={(b) => save.mutate(b)} onDelete={(id) => confirm("Удалить баннер?") && remove.mutate(id)} saving={save.isPending} />
    </Container>
  )
}

const Upload = ({ value, onChange, label }: { value?: string | null; onChange: (url: string) => void; label: string }) => {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const r: any = await sdk.admin.upload.create({ files: [file] })
      const url = r?.files?.[0]?.url
      if (!url) throw new Error("Сервер не вернул адрес файла")
      onChange(url)
    } catch (e: any) { toast.error(e?.message || "Не удалось загрузить") } finally { setBusy(false) }
  }
  return (
    <div className="flex flex-col gap-1">
      <Label size="xsmall">{label}</Label>
      {value && <img src={value} alt="" className="max-h-40 w-full rounded border object-contain bg-white" />}
      <div className="flex gap-2">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button size="small" variant="secondary" isLoading={busy} onClick={() => ref.current?.click()}>{value ? "Заменить картинку" : "Загрузить картинку"}</Button>
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="или вставьте ссылку на картинку" />
      </div>
    </div>
  )
}

const BannerDrawer = ({ banner, onClose, onSave, onDelete, saving }: { banner: Partial<Banner> | null; onClose: () => void; onSave: (b: Partial<Banner>) => void; onDelete: (id: string) => void; saving: boolean }) => {
  const [f, setF] = useState<Partial<Banner>>(EMPTY)
  useEffect(() => { if (banner) setF({ ...EMPTY, ...banner, starts_at: banner.starts_at ? String(banner.starts_at).slice(0, 10) : "", ends_at: banner.ends_at ? String(banner.ends_at).slice(0, 10) : "" }) }, [banner])
  const set = (k: keyof Banner, v: any) => setF((s) => ({ ...s, [k]: v }))
  return (
    <Drawer open={!!banner} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header><Drawer.Title>{f.id ? "Баннер" : "Новый баннер"}</Drawer.Title></Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-1"><Label size="xsmall">Название (для себя)</Label><Input value={f.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Осень/зима 2027" /></div>
          <Upload label="Картинка (1920×560)" value={f.image_url} onChange={(u) => set("image_url", u)} />
          <Upload label="Картинка для телефона (необязательно, 800×800)" value={f.mobile_image_url} onChange={(u) => set("mobile_image_url", u)} />
          <div className="flex flex-col gap-1"><Label size="xsmall">Ссылка при клике (адрес на сайте)</Label><Input value={f.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="/categories/osen-zima-2027" /></div>
          <div className="flex flex-col gap-1"><Label size="xsmall">Подпись для незрячих и поисковиков (alt)</Label><Input value={f.alt || ""} onChange={(e) => set("alt", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1"><Label size="xsmall">Место</Label>
              <Select value={f.place || "hero"} onValueChange={(v) => set("place", v)}><Select.Trigger><Select.Value /></Select.Trigger><Select.Content>{Object.entries(PLACES).map(([k, v]) => <Select.Item key={k} value={k}>{v}</Select.Item>)}</Select.Content></Select></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Порядок</Label><Input type="number" value={f.sort ?? 0} onChange={(e) => set("sort", Number(e.target.value))} /></div>
            <div className="flex items-center gap-2 pt-5"><Switch checked={!!f.active} onCheckedChange={(v) => set("active", v)} /><Label size="xsmall">Показывать</Label></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Показывать с</Label><Input type="date" value={f.starts_at || ""} onChange={(e) => set("starts_at", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label size="xsmall">Показывать по</Label><Input type="date" value={f.ends_at || ""} onChange={(e) => set("ends_at", e.target.value)} /></div>
          </div>
        </Drawer.Body>
        <Drawer.Footer className="flex justify-between">
          <div>{f.id && <Button variant="danger" size="small" onClick={() => onDelete(f.id!)}>Удалить</Button>}</div>
          <div className="flex gap-2"><Button variant="secondary" size="small" onClick={onClose}>Отмена</Button><Button size="small" isLoading={saving} onClick={() => onSave({ ...f, starts_at: f.starts_at || null, ends_at: f.ends_at || null })}>Сохранить</Button></div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

export const config = defineRouteConfig({ label: "Баннеры", icon: Photo })
export default BannersRoute
