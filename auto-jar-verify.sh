#!/bin/bash

JAR_RELEASENAME="16A"
JAR_RELEASENUM="11.0"
JAR_EMAILFROM="brian.bothwell@broadcom.com"
JAR_EMAILTO="brian.bothwell@broadcom.com"

JAR_BUILDDIR="/elx/local/ftpse/scm_builds/be2/Palau_${JAR_RELEASENUM}"
JAR_WORKDIR="${HOME}/Downloads/jars/${JAR_RELEASENAME}"
JAR_NODEBIN="${HOME}/.nvm/v4.2.4/bin/node"
JAR_VERIFYBIN="${HOME}/jar-verify/util/jar-verify.js"

JAR_LASTBUILDDIR=$(ls -td ${JAR_WORKDIR}/${JAR_RELEASENUM}.* | head -1 )
JAR_LASTBUILDNUM=${JAR_LASTBUILDDIR#${JAR_WORKDIR}/}
JAR_LASTBUILDSRC="${JAR_BUILDDIR}/${JAR_LASTBUILDNUM}"

for i in $(find ${JAR_BUILDDIR}/* -maxdepth 0 -newer ${JAR_LASTBUILDSRC} -print); do
  JAR_BUILDNUM=${i#${JAR_BUILDDIR}/}
  if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/ReleaseNotes-${JAR_BUILDNUM}.html" ]; then
    # Build is complete
    if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/External/Palau_${JAR_BUILDNUM}_Lenovo_Package.zip" ] || [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_FW_Internal.zip" ] || [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_LNX_KIT_Internal.zip" ] || [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_WIN_Internal.zip" ]; then
      # Some JAR file packages exist
      if [ ! -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/" ]; then
        # Ignore build if dir already exists - otherwise create directory
        mkdir "${JAR_WORKDIR}/${JAR_BUILDNUM}/"

        if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/External/Palau_${JAR_BUILDNUM}_Lenovo_Package.zip" ]; then
          # Lenovo package exists - unzip JAR files
          unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/External/Palau_${JAR_BUILDNUM}_Lenovo_Package.zip" *Red/*.jar *Red/triggerfile -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"

          # Move JARs to base directory and delete extras
          find "${JAR_WORKDIR}/${JAR_BUILDNUM}/${JAR_BUILDNUM}/" -name '*.jar' -o -name 'triggerfile' -exec mv {} "${JAR_WORKDIR}/${JAR_BUILDNUM}/" \;
          rm -rf "${JAR_WORKDIR}/${JAR_BUILDNUM}/${JAR_BUILDNUM}/"

          # Run jar-verify against new build
          ${JAR_NODEBIN} ${JAR_VERIFYBIN} -r ${JAR_RELEASENAME} -b ${JAR_BUILDNUM} > jar-verify-results-${JAR_BUILDNUM}.txt

          # Determine if results are pass or fail
          JAR_ERRORCOUNT=$(grep 'Finished all activity with' jar-verify-results-${JAR_BUILDNUM}.txt | cut -d ' ' -f 6)
          if [[ ${JAR_ERRORCOUNT} -eq 0 ]]; then
            JAR_RESULTS="PASS"
          else
            JAR_RESULTS="FAIL"
          fi

          # E-mail jar-verify results
          mail -s "JAR Verification Results For ${JAR_RELEASENAME} Build ${JAR_BUILDNUM} -- ${JAR_RESULTS}" "${JAR_EMAILTO}" -- -f ${JAR_EMAILFROM} < jar-verify-results-${JAR_BUILDNUM}.txt

          # Delete jar-verify results
          rm -f jar-verify-results-${JAR_BUILDNUM}.txt
        else
          # Unzip firmware JARs from internal package if it exists
          if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_FW_Internal.zip" ]; then
            unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_FW_Internal.zip" -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"
          fi

          # Unzip Linux driver JARs from internal package if it exists
          if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_LNX_KIT_Internal.zip" ]; then
            unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_LNX_KIT_Internal.zip" -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"
          fi

          # Unzip Windows driver JARs from internal package if it exists
          if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_WIN_Internal.zip" ]; then
            unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_WIN_Internal.zip" -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"
          fi

          # Move JARs to base directory and delete extras
          find "${JAR_WORKDIR}/${JAR_BUILDNUM}/packages/" -name '*.jar' -exec mv {} "${JAR_WORKDIR}/${JAR_BUILDNUM}/" \;
          rm -rf "${JAR_WORKDIR}/${JAR_BUILDNUM}/packages/"
        fi
      fi
    fi
  fi
done

# Delete builds older than 30 days
find ${JAR_WORKDIR}/${JAR_RELEASENUM}.* -maxdepth 0 -mtime +30 -exec rm -rf {} \;