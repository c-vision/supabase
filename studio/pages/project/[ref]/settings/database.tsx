import useSWR from 'swr'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { FC, useState } from 'react'
import { isUndefined } from 'lodash'
import { useRouter } from 'next/router'
import { toJS } from 'mobx'
import { observer } from 'mobx-react-lite'
import { Typography, Input, Button, IconDownload, IconArrowRight, Tabs } from '@supabase/ui'

import { API_URL } from 'lib/constants'
import { useStore, withAuth } from 'hooks'
import { get } from 'lib/common/fetch'
import { TIME_PERIODS_INFRA } from 'lib/constants'
import { pluckObjectFields } from 'lib/helpers'
import { SettingsLayout } from 'components/layouts'
import Panel from 'components/to-be-cleaned/Panel'
import DateRangePicker from 'components/to-be-cleaned/DateRangePicker'
import ChartHandler from 'components/to-be-cleaned/Charts/ChartHandler'
import { ProjectUsageMinimal } from 'components/to-be-cleaned/Usage'

dayjs.extend(customParseFormat)
dayjs.extend(timezone)
dayjs.extend(utc)

const ProjectSettings = () => {
  const router = useRouter()
  const { ref } = router.query

  const { ui } = useStore()
  const project = ui.selectedProject

  return (
    <SettingsLayout title="Database">
      <div className="content w-full h-full overflow-y-auto">
        <div className="w-full px-4 py-4 max-w-5xl">
          <Usage project={project} />
          <GeneralSettings projectRef={ref} />
        </div>
      </div>
    </SettingsLayout>
  )
}

export default withAuth(observer(ProjectSettings))

const Usage: FC<any> = ({ project }) => {
  const [dateRange, setDateRange] = useState<any>(undefined)
  const router = useRouter()
  const { ref } = router.query

  return (
    <>
      <div>
        <section className="">
          <Panel
            title={
              <Typography.Title key="panel-title" level={5} className="mb-0">
                Database health
              </Typography.Title>
            }
          >
            <Panel.Content>
              <div className="flex space-x-3 items-center mb-4">
                <DateRangePicker
                  loading={false}
                  value={'3h'}
                  options={TIME_PERIODS_INFRA}
                  currentBillingPeriodStart={undefined}
                  onChange={setDateRange}
                />
                {dateRange && (
                  <div className="flex space-x-2 items-center">
                    <Typography.Text type="secondary">
                      {dayjs(dateRange.period_start.date).format('MMMM D, hh:mma')}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="opacity-50">
                      <IconArrowRight size={12} />
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {dayjs(dateRange.period_end.date).format('MMMM D, hh:mma')}
                    </Typography.Text>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                {dateRange && (
                  <ChartHandler
                    startDate={dateRange?.period_start?.date}
                    endDate={dateRange?.period_end?.date}
                    attribute={'ram_usage'}
                    label={'Memory usage'}
                    interval={dateRange.interval}
                    provider={'infra-monitoring'}
                  />
                )}

                {dateRange && (
                  <ChartHandler
                    startDate={dateRange?.period_start?.date}
                    endDate={dateRange?.period_end?.date}
                    attribute={'cpu_usage'}
                    label={'CPU usage'}
                    interval={dateRange.interval}
                    provider={'infra-monitoring'}
                  />
                )}
              </div>
            </Panel.Content>
          </Panel>
        </section>
      </div>
      <div>
        <section className="mt-6">
          <Panel
            title={
              <Typography.Title key="panel-title" level={5} className="mb-0">
                Database storage
              </Typography.Title>
            }
          >
            <Panel.Content>
              <ProjectUsageMinimal
                projectRef={ref}
                subscription_id={project.subscription_id}
                filter={'Database'}
              />
            </Panel.Content>
          </Panel>
        </section>
      </div>
    </>
  )
}

const DownloadCertificate: FC<any> = ({ createdAt }) => {
  // instances before 3 : 08 pm sgt 29th April don't have certs installed
  if (new Date(createdAt) < new Date('2021-04-30')) return null
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT === 'prod' ? 'prod' : 'staging'
  return (
    <Panel>
      <Panel.Content>
        <div className="w-full flex items-center justify-between">
          <div>
            <Typography.Text className="block">SSL Connection</Typography.Text>
            <div style={{ maxWidth: '320px' }}>
              <Typography.Text type="secondary" className="opacity-50">
                <p className="opacity-50">
                  Use this cert when connecting to your database to prevent snooping and
                  man-in-the-middle attacks.
                </p>
              </Typography.Text>
            </div>
          </div>
          <Button type="default" icon={<IconDownload />}>
            <a
              href={`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/${env}/ssl/${env}-ca-2021.crt`}
            >
              Download Certificate
            </a>
          </Button>
        </div>
      </Panel.Content>
    </Panel>
  )
}

const GeneralSettings: FC<any> = ({ projectRef }) => {
  const { data, error }: any = useSWR(`${API_URL}/props/project/${projectRef}/settings`, get)

  if (data?.error || error) {
    return (
      <div className="p-6 mx-auto sm:w-full md:w-3/4 text-center">
        <Typography.Title level={3}>Error loading database settings</Typography.Title>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 mx-auto sm:w-full md:w-3/4 text-center">
        <Typography.Title level={3}>Loading...</Typography.Title>
      </div>
    )
  }

  const { project } = data
  const formModel = toJS(project)
  const DB_FIELDS = ['db_host', 'db_name', 'db_port', 'db_user', 'inserted_at']
  const connectionInfo = pluckObjectFields(formModel, DB_FIELDS)

  const defaultConnString =
    `postgresql://${connectionInfo.db_user}:[YOUR-PASSWORD]@` +
    `${connectionInfo.db_host}:${connectionInfo.db_port.toString()}` +
    `/${connectionInfo.db_name}`
  const golangConnString =
    `user=${connectionInfo.db_user} password=[YOUR-PASSWORD] ` +
    `host=${connectionInfo.db_host} port=${connectionInfo.db_port.toString()}` +
    ` dbname=${connectionInfo.db_name}`

  return (
    <>
      <div className="">
        <section className="space-y-6 mt-6">
          <Panel
            title={[
              <Typography.Title key="panel-title" level={5} className="mb-0">
                Connection info
              </Typography.Title>,
              // <Title level={4}>Connection info</Title>
            ]}
          >
            <Panel.Content className="space-y-6">
              <Input
                className="input-mono"
                layout="horizontal"
                readOnly
                copy
                disabled
                value={connectionInfo.db_host}
                label="Host"
              />

              <Input
                className="input-mono"
                layout="horizontal"
                readOnly
                copy
                disabled
                value={connectionInfo.db_name}
                label="Database name"
              />

              <Input
                className="input-mono"
                layout="horizontal"
                readOnly
                copy
                disabled
                value={connectionInfo.db_port.toString()}
                label="Port"
              />

              <Input
                layout="horizontal"
                className="input-mono text-base table-input-cell"
                readOnly
                copy
                disabled
                value={connectionInfo.db_user}
                label="User"
              />

              <Input
                className="input-mono"
                layout="horizontal"
                disabled
                readOnly
                value={'[The password you provided when you created this project]'}
                label="Password"
              />
            </Panel.Content>
          </Panel>
        </section>
        <DownloadCertificate createdAt={connectionInfo.inserted_at} />
      </div>
      <div>
        <section className="space-y-6 mt-6">
          <Panel
            title={
              <Typography.Title key="panel-title" level={5} className="mb-0">
                Connection string
              </Typography.Title>
            }
          >
            <Panel.Content>
              <Tabs type="underlined">
                {/* @ts-ignore */}
                <Tabs.Panel id="psql" label="PSQL">
                  <Input copy readOnly disabled value={defaultConnString} />
                </Tabs.Panel>

                {/* @ts-ignore */}
                <Tabs.Panel id="golang" label="Golang">
                  <Input copy readOnly disabled value={golangConnString} />
                </Tabs.Panel>

                {/* @ts-ignore */}
                <Tabs.Panel id="jdbc" label="JDBC">
                  <Input
                    copy
                    readOnly
                    disabled
                    value={
                      `jdbc:postgresql://${
                        connectionInfo.db_host
                      }:${connectionInfo.db_port.toString()}` +
                      `/${connectionInfo.db_name}?user=${connectionInfo.db_user}&password=[YOUR-PASSWORD]`
                    }
                  />
                </Tabs.Panel>

                {/* @ts-ignore */}
                <Tabs.Panel id="dotnet" label=".NET">
                  <Input
                    copy
                    readOnly
                    disabled
                    value={
                      `User Id=${connectionInfo.db_user};Password=[YOUR-PASSWORD];` +
                      `Server=${
                        connectionInfo.db_host
                      };Port=${connectionInfo.db_port.toString()};` +
                      `Database=${connectionInfo.db_name}`
                    }
                  />
                </Tabs.Panel>

                {/* @ts-ignore */}
                <Tabs.Panel id="nodejs" label="Nodejs">
                  <Input copy readOnly disabled value={defaultConnString} />
                </Tabs.Panel>

                {/* @ts-ignore */}
                <Tabs.Panel id="php" label="PHP">
                  <Input copy readOnly disabled value={golangConnString} />
                </Tabs.Panel>

                {/* @ts-ignore */}
                <Tabs.Panel id="python" label="Python">
                  <Input
                    copy
                    readOnly
                    disabled
                    value={
                      `user=${connectionInfo.db_user} password=[YOUR-PASSWORD]` +
                      `host=${connectionInfo.db_host} port=${connectionInfo.db_port.toString()}` +
                      ` database=${connectionInfo.db_name}`
                    }
                  />
                </Tabs.Panel>
              </Tabs>
            </Panel.Content>
          </Panel>
        </section>
      </div>
    </>
  )
}
