<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <q-form autocomplete="off" class="col-12 col-sm-6 col-md-3 q-gutter-md">
        <div>
          <q-select v-model="state" :disable="isLoading" input-debounce="250" label="Estado" :options="statesOptions" outlined use-input @filter="filterStates" @input="getData" />
        </div>

        <div>
          <q-select ref="city" v-model="city" :disable="isDisabled" input-debounce="250" label="Cidade" :loading="isLoading" :options="citiesOptions" outlined use-input @filter="filterCities" @input="getBedsData" />
        </div>

        <div class="relative-position">
          <q-date v-model="date" class="full-width" :disable="isDisabled" />

          <q-inner-loading :showing="isLoading">
            <q-spinner color="grey-5" size="50px" />
          </q-inner-loading>
        </div>
      </q-form>

      <div class="col-12 col-sm-6 col-md-9">
        <div v-if="state">
          <div class="text-grey-7 text-h5">{{ state.label }}</div>
          <div class="text-primary text-h2 q-mt-sm">{{ isLoading ? '...' : city.label }}</div>
        </div>

        <div v-if="state" class="q-mt-lg row q-gutter-md">
          <div class="col">
            <q-card class="full-width">
              <q-card-section>
                <div class="text-h4 text-primary">{{ casesTotal }}</div>
                <div class="text-subtitle2">Casos confirmados</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col">
            <q-card class="full-width">
              <q-card-section>
                <div class="text-h4 text-negative">{{ deathsTotal }}</div>
                <div class="text-subtitle2">Óbitos</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="q-mt-lg">
          <div class="q-mb-sm text-grey-5">Casos confirmados e óbitos</div>
          <line-chart :chart-data="casesChartData" :options="lineChartOptions" />
        </div>

        <q-inner-loading :showing="isLoading">
          <q-spinner color="grey-5" size="50px" />
        </q-inner-loading>

        <div v-if="city.value" class="q-mt-lg relative-position">
          <div class="text-primary text-h4">Leitos</div>

          <div class="text-grey-5 text-h6">Últimos Boletins Hospitalares</div>
          <q-table class="q-mt-sm" :columns="bedsColumns" :data="rawBedsData" hide-pagination />

          <!-- <pre>{{ rawBedsData }}</pre> -->

          <q-inner-loading :showing="isLoading || isLoadingBeds">
            <q-spinner color="grey-5" size="50px" />
          </q-inner-loading>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { format } from 'date-fns'
import { colors, extend } from 'quasar'

import LineChart from 'components/LineChart'
import states from 'utils/states'

function getLastValue (data) {
  const items = Object.values(data).reverse()

  for (const item of items) {
    if (item !== null) {
      return item.toLocaleString()
    }
  }

  return null
}

function parseData (list = {}, prefix) {
  const items = {}

  Object.keys(list).reverse().forEach(key => {
    if (key.startsWith(prefix)) {
      items[key.split('_')[1]] = list[key]
    }
  })

  return items
}

export default {
  components: {
    LineChart
  },

  data () {
    return {
      date: '',
      citiesOptions: [],
      city: '',
      isLoading: false,
      isLoadingBeds: false,
      rawData: [],
      rawBedsData: [],
      state: '',
      statesOptions: []
    }
  },

  computed: {
    bedsColumns () {
      function compare (total = 0, used = 0) {
        if (total === 0 && used > total) { total = 1 }
        return `${used}/${total} (${Math.round(used / total * 100) || 0}%)`
      }

      return [
        { name: 'data', field: row => (new Date(row.dataNotificacaoOcupacao)).toLocaleString(), label: 'Data', align: 'left' },
        { name: 'cnes', field: 'cnes', label: 'CNES', align: 'left' },
        { name: 'unidade', field: 'nomeCnes', label: 'Unidade', align: 'left' },
        { name: 'uti-covid', field: row => compare(row.ofertaSRAGUti, row.ocupSRAGUti), label: 'Leitos UTI COVID-19', align: 'left', classes: 'text-negative' },
        { name: 'enf-covid', field: row => compare(row.ofertaSRAGCli, row.ocupSRAGCli), label: 'Leitos Enferm. COVID-19', align: 'left', classes: 'text-negative' },
        { name: 'uti-normal', field: row => compare(row.ofertaHospUti, row.ocupHospUti), label: 'Leitos UTI Outros', align: 'left' },
        { name: 'enf-normal', field: row => compare(row.ofertaHospCli, row.ocupHospCli), label: 'Leitos Enferm. Outros', align: 'left' }
      ]
    },

    casesChartData () {
      return {
        labels: this.casesLabels,

        datasets: [
          {
            label: 'Casos confirmados',
            data: Object.values(this.casesData),

            borderColor: colors.getBrand('primary'),
            fill: false
          },

          {
            label: 'Óbitos',
            data: Object.values(this.deathsData),

            borderColor: colors.getBrand('negative'),
            fill: false
          }
        ]
      }
    },

    casesData () {
      return parseData(this.cityData, 'confirmados')
    },

    casesLabels () {
      return Object.keys(this.casesData).map(
        date => format(new Date(date), 'dd/MM/yyyy')
      )
    },

    casesTotal () {
      return getLastValue(this.casesData)
    },

    cities () {
      return this.rawData.map(
        (item, index) => ({ value: index, label: item.municipio })
      )
    },

    cityData () {
      return this.state && this.rawData[this.city.value || 0]
    },

    deathsData () {
      return parseData(this.cityData, 'mortes')
    },

    deathsTotal () {
      return getLastValue(this.deathsData)
    },

    isDisabled () {
      return !this.state || this.isLoading
    },

    lineChartOptions () {
      return {
        legend: { position: 'bottom' },
        tooltips: { mode: 'index', intersect: false }
      }
    },

    states () {
      const items = []

      for (const value in states) {
        items.push({ label: states[value], value })
      }

      return items
    }
  },

  beforeMount () {
    this.copyStates()
  },

  methods: {
    copyCities () {
      extend(true, this.citiesOptions, this.cities)
    },

    copyStates () {
      extend(true, this.statesOptions, this.states)
    },

    async getData () {
      this.isLoading = true

      try {
        const { data } = await this.$axios.get(
          `https://brasil.io/covid19/import-data/${this.state.value}/`
        )

        this.rawData = data.cases

        this.copyCities()
        this.setDateRange()

        this.city = this.cities[0]
      } catch (error) {
        this.$q.notify('Erro ao obter dados.')
      } finally {
        this.isLoading = false
      }
    },

    async getBedsData (city) {
      this.rawBedsData = []

      if (!city.value) {
        return
      }

      this.isLoadingBeds = true

      try {
        const { data } = await this.$axios.get(`/api?city=${city.label}`)
        this.rawBedsData = data
      } catch (error) {
        this.$q.notify('Erro ao obter dados dos leitos.')
      } finally {
        this.isLoadingBeds = false
      }
    },

    filterCities (value, update) {
      update(() => {
        const needle = value.toLocaleLowerCase()

        this.citiesOptions = this.cities.filter(option =>
          option.label.toLowerCase().includes(needle)
        )
      })
    },

    filterStates (value, update) {
      update(() => {
        const needle = value.toLocaleLowerCase()

        this.statesOptions = this.states.filter(option =>
          [...Object.values(option)].join('').toLowerCase().includes(needle)
        )
      })
    },

    setDateRange () {
      const cases = Object.keys(this.casesData)

      const from = cases[0].replaceAll('-', '/')
      const to = cases.pop().replaceAll('-', '/')

      this.date = { from, to }
    }
  }
}
</script>
